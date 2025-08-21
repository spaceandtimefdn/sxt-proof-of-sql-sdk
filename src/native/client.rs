use super::{get_access_token, query_commitments, substrate::SxtConfig};
use crate::base::{
    plan_prover_query, prover::ProverResponse, uppercase_table_ref, verify_prover_response,
    CommitmentEvaluationProofId, CommitmentScheme, DynOwnedTable,
};
use bumpalo::Bump;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::HyperKZGCommitmentEvaluationProof;
use proof_of_sql::{
    base::{commitment::CommitmentEvaluationProof, database::OwnedTable},
    proof_primitive::dory::DynamicDoryEvaluationProof,
};
use proof_of_sql_planner::get_table_refs_from_statement;
use reqwest::Client;
use sqlparser::{dialect::GenericDialect, parser::Parser};
use subxt::Config;

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

    /// Path to the verifier setup binary file. If `None`, the default verifier setup is used.
    pub verifier_setup: Option<String>,
}

impl SxTClient {
    /// Create a new SxT client
    pub fn new(
        prover_root_url: String,
        auth_root_url: String,
        substrate_node_url: String,
        sxt_api_key: String,
        verifier_setup: Option<String>,
    ) -> Self {
        Self {
            prover_root_url,
            auth_root_url,
            substrate_node_url,
            sxt_api_key,
            verifier_setup,
        }
    }

    /// Query and verify a SQL query at the given SxT block by commitment evaluation proof.
    ///
    /// Run a SQL query and verify the result.
    ///
    /// If `block_ref` is `None`, the latest block is used.
    pub async fn query_and_verify_by_cpi<CPI>(
        &self,
        query: &str,
        block_ref: Option<<SxtConfig as Config>::Hash>,
        bump: &Bump,
    ) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, Box<dyn core::error::Error>>
    where
        CPI: CommitmentEvaluationProofId,
        <CPI as CommitmentEvaluationProofId>::DeserializationError: 'static,
    {
        let dialect = GenericDialect {};
        let query_parsed = Parser::parse_sql(&dialect, query)?[0].clone();
        let table_refs = get_table_refs_from_statement(&query_parsed)?
            .into_iter()
            .map(uppercase_table_ref)
            .collect::<Vec<_>>();

        // Load verifier setup
        let verifier_setup_bytes = match &self.verifier_setup {
            Some(path) => &std::fs::read(path)?,
            None => CPI::DEFAULT_VERIFIER_SETUP_BYTES,
        };
        let verifier_setup = CPI::deserialize_verifier_setup(verifier_setup_bytes, bump)?;
        // Accessor setup
        let accessor = query_commitments::<<SxtConfig as Config>::Hash, CPI>(
            &table_refs,
            &self.substrate_node_url,
            block_ref,
        )
        .await?;

        let (prover_query, proof_plan) = plan_prover_query::<CPI>(&query_parsed, &accessor)?;

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

        let verified_table_result = verify_prover_response::<CPI>(
            &prover_response,
            &proof_plan,
            &[],
            &accessor,
            &verifier_setup,
        )?;

        Ok(verified_table_result)
    }

    /// Query and verify a SQL query at the given SxT block
    ///
    /// Run a SQL query and verify the result.
    ///
    /// If `block_ref` is `None`, the latest block is used.
    pub async fn query_and_verify(
        &self,
        query: &str,
        block_ref: Option<<SxtConfig as Config>::Hash>,
        commitment_scheme: CommitmentScheme,
    ) -> Result<DynOwnedTable, Box<dyn core::error::Error>> {
        let bump = Bump::new();
        match commitment_scheme {
            CommitmentScheme::DynamicDory => self
                .query_and_verify_by_cpi::<DynamicDoryEvaluationProof>(query, block_ref, &bump)
                .await
                .map(DynOwnedTable::Dory),
            #[cfg(feature = "hyperkzg")]
            CommitmentScheme::HyperKzg => self
                .query_and_verify_by_cpi::<HyperKZGCommitmentEvaluationProof>(
                    query, block_ref, &bump,
                )
                .await
                .map(DynOwnedTable::BN),
        }
    }
}
