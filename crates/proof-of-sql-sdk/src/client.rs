use crate::{
    get_access_token, query_commitments,
    substrate::{verify_attestations_for_block, AttestationError, SxtConfig},
};
use proof_of_sql::proof_primitive::hyperkzg::{BNScalar, HyperKZGCommitmentEvaluationProof};
use proof_of_sql::sql::evm_proof_plan::EVMProofPlan;
use proof_of_sql::{
    base::database::OwnedTable,
    proof_primitive::dory::{DoryScalar, DynamicDoryEvaluationProof, VerifierSetup},
};
use proof_of_sql_planner::{get_table_refs_from_statement, postprocessing::PostprocessingStep};
use reqwest::Client;
use sqlparser::{dialect::GenericDialect, parser::Parser};
use std::path::Path;
use subxt::Config;
use sxt_proof_of_sql_sdk_local::{
    plan_prover_query_dory, prover::ProverResponse, uppercase_table_ref, verify_prover_response,
};

/// Space and Time (SxT) client
#[derive(Debug, Clone)]
pub struct SxTClient {
    /// Root URL for the Prover service
    pub prover_root_url: String,

    /// Root URL for the Auth service
    pub auth_root_url: String,

    /// URL for the Substrate node service
    pub substrate_node_url: String,

    /// API Key for Space and Time (SxT) services
    ///
    /// Please visit [Space and Time Studio](https://app.spaceandtime.ai/) to obtain an API key
    /// if you do not have one.
    pub sxt_api_key: String,

    /// Path to the verifier setup binary file
    pub verifier_setup: String,
}

impl SxTClient {
    /// Create a new SxT client
    pub fn new(
        prover_root_url: String,
        auth_root_url: String,
        substrate_node_url: String,
        sxt_api_key: String,
        verifier_setup: String,
    ) -> Self {
        Self {
            prover_root_url,
            auth_root_url,
            substrate_node_url,
            sxt_api_key,
            verifier_setup,
        }
    }

    /// Query and verify a SQL query at the given SxT block.
    ///
    /// Run a SQL query and verify the result using Dynamic Dory.
    ///
    /// If `block_ref` is `None`, the latest block is used.
    pub async fn query_and_verify(
        &self,
        query: &str,
        block_ref: Option<<SxtConfig as Config>::Hash>,
    ) -> Result<OwnedTable<BNScalar>, Box<dyn core::error::Error>> {
        let dialect = GenericDialect {};
        let query_parsed = Parser::parse_sql(&dialect, query)?[0].clone();
        let table_refs = get_table_refs_from_statement(&query_parsed)?
            .into_iter()
            .map(uppercase_table_ref)
            .collect::<Vec<_>>();

        // Load verifier setup

        use ark_ec::AffineRepr;
        use halo2curves::bn256::{Fq, Fq2, G1Affine, G2Affine};
        use nova_snark::{
            provider::hyperkzg::{CommitmentKey, EvaluationEngine},
            traits::evaluation::EvaluationEngineTrait,
        };
        use proof_of_sql::proof_primitive::hyperkzg::HyperKZGEngine;

        const VK_X_REAL: [u64; 4] = [
            0x2a74_74c0_708b_ef80,
            0xf762_edcf_ecfe_1c73,
            0x2340_a37d_fae9_005f,
            0x285b_1f14_edd7_e663,
        ];
        const VK_X_IMAG: [u64; 4] = [
            0x85ad_b083_e48c_197b,
            0x39c2_b413_1094_5472,
            0xda72_7c1d_ef86_0103,
            0x17cc_9307_7f56_f654,
        ];
        const VK_Y_REAL: [u64; 4] = [
            0xc6db_5ddb_9bde_7fd0,
            0x0931_3450_580c_4c17,
            0x29ec_66e8_f530_f685,
            0x2bad_9a37_4aec_49d3,
        ];
        const VK_Y_IMAG: [u64; 4] = [
            0xa630_d3c7_cdaa_6ed9,
            0xe32d_d53b_1584_4956,
            0x674f_5b2f_6fdb_69d9,
            0x219e_dfce_ee17_23de,
        ];
        let tau_h = G2Affine {
            x: Fq2::new(Fq::from_raw(VK_X_REAL), Fq::from_raw(VK_X_IMAG)),
            y: Fq2::new(Fq::from_raw(VK_Y_REAL), Fq::from_raw(VK_Y_IMAG)),
        };
        let (_, verifier_setup) = EvaluationEngine::<HyperKZGEngine>::setup(&CommitmentKey::new(
            vec![],
            G1Affine::generator(),
            tau_h,
        ));

        // Accessor setup
        let accessor = query_commitments(&table_refs, &self.substrate_node_url, block_ref).await?;

        let (prover_query, proof_plan_with_post_processing) =
            plan_prover_query_dory(&query_parsed, &accessor)?;

        let client = Client::new();
        let access_token = get_access_token(&self.sxt_api_key, &self.auth_root_url).await?;
        let response = client
            .post(format!("{}/v1/prove", &self.prover_root_url))
            .bearer_auth(&access_token)
            .json(&prover_query)
            .send()
            .await?
            .error_for_status()?;
        let serialized_prover_response = response.text().await?;
        let prover_response = serde_json::from_str::<ProverResponse>(&serialized_prover_response)
            .map_err(|_e| {
            format!(
                "Failed to parse prover response: {}",
                &serialized_prover_response
            )
        })?;

        let verified_table_result = verify_prover_response::<HyperKZGCommitmentEvaluationProof>(
            &prover_response,
            &EVMProofPlan::new(proof_plan_with_post_processing.plan().clone()),
            &[],
            &accessor,
            &&verifier_setup,
        )?;

        // Apply postprocessing steps
        if let Some(post_processing) = proof_plan_with_post_processing.postprocessing() {
            Ok(post_processing.apply(verified_table_result)?)
        } else {
            Ok(verified_table_result)
        }
    }

    /// Verify attestations for a specific block number
    ///
    /// This method uses the `verify_attestations_for_block` function to validate
    /// attestations for a given block number.
    ///
    /// # Arguments
    ///
    /// * `block_number` - The block number for which attestations need to be verified.
    ///
    /// # Returns
    ///
    /// Returns `Ok(())` if all attestations are valid and consistent. Otherwise, it returns an
    /// `AttestationError` describing the failure.
    pub async fn verify_attestations(&self, block_number: u32) -> Result<(), AttestationError> {
        verify_attestations_for_block(&self.substrate_node_url, block_number).await
    }
}
