use super::{fetch_attestation, get_access_token, ZkQueryClient};
use crate::base::{
    attestation::verify_attestations,
    verify_prover_via_gateway_response,
    zk_query_models::{QuerySubmitRequest, SxtNetwork},
    CommitmentEvaluationProofId, CommitmentScheme, DynOwnedTable,
};
use bumpalo::Bump;
use hex::ToHex;
use jsonrpsee::ws_client::WsClientBuilder;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::HyperKZGCommitmentEvaluationProof;
use proof_of_sql::{
    base::{
        commitment::{CommitmentEvaluationProof, QueryCommitments, TableCommitment},
        database::{OwnedTable, TableRef},
        try_standard_binary_deserialization,
    },
    proof_primitive::dory::DynamicDoryEvaluationProof,
    sql::{evm_proof_plan::EVMProofPlan, proof::QueryProof},
};
use reqwest::Client;
use sp_core::H256;
use url::Url;

/// Space and Time (SxT) client
#[derive(Debug, Clone)]
pub struct SxTClient {
    /// SXT Network
    pub network: SxtNetwork,

    /// Root URL for SXT services
    pub root_url: Url,

    /// Root URL for the Prover service
    pub prover_url: Url,

    /// Root URL for the Auth service
    pub auth_root_url: Url,

    /// URL for the Substrate node service
    pub substrate_node_url: Url,

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
        network: SxtNetwork,
        root_url: Url,
        prover_url: Url,
        auth_root_url: Url,
        substrate_node_url: Url,
        sxt_api_key: String,
        verifier_setup: Option<String>,
    ) -> Self {
        Self {
            network,
            root_url,
            prover_url,
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
    #[expect(clippy::type_complexity)]
    pub async fn query_and_verify_by_cpi<CPI>(
        &self,
        query: &str,
        block_ref: Option<H256>,
        bump: &Bump,
    ) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, Box<dyn core::error::Error>>
    where
        CPI: CommitmentEvaluationProofId,
        <CPI as CommitmentEvaluationProofId>::DeserializationError: 'static,
    {
        // Load verifier setup
        let verifier_setup_bytes = match &self.verifier_setup {
            Some(path) => &std::fs::read(path)?,
            None => CPI::DEFAULT_VERIFIER_SETUP_BYTES,
        };
        let verifier_setup = CPI::deserialize_verifier_setup(verifier_setup_bytes, bump)?;
        let ws_client = WsClientBuilder::new()
            .build(self.substrate_node_url.clone())
            .await?;

        // Get the appropriate block hash and attestations
        let (best_block_hash, attestations) = fetch_attestation(&ws_client, block_ref).await?;

        // Run the query to get the proof plan and query results and Merkle tree
        let access_token = get_access_token(&self.sxt_api_key, self.auth_root_url.as_str()).await?;
        let request = QuerySubmitRequest {
            sql_text: query.to_string(),
            source_network: self.network,
            commitment_scheme: Some(CPI::COMMITMENT_SCHEME.into()),
            block_hash: Some(best_block_hash.encode_hex()),
            timeout: None,
        };
        let query_results_response = ZkQueryClient {
            base_url: self.root_url.clone(),
            client: Client::new(),
            access_token: access_token.clone(),
        }
        .run_zk_query(request)
        .await?;
        if !query_results_response.success {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!(
                    "ZK query failed: {}",
                    query_results_response
                        .error
                        .unwrap_or("Query failed without error".to_string())
                ),
            )));
        }

        // Verify the attestations
        let table_commitment_with_proof = query_results_response.commitments.commitments;
        verify_attestations(
            &attestations,
            &table_commitment_with_proof,
            CPI::COMMITMENT_SCHEME,
        )?;

        let query_commitments: QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment> =
            table_commitment_with_proof
                .into_iter()
                .map(
                    |(table_id, table_commitment_with_proof)| -> Result<
                        (
                            TableRef,
                            TableCommitment<<CPI as CommitmentEvaluationProof>::Commitment>,
                        ),
                        Box<dyn core::error::Error>,
                    > {
                        let table_ref = TableRef::try_from(table_id.as_str())?;
                        let table_commitment: TableCommitment<
                            <CPI as CommitmentEvaluationProof>::Commitment,
                        > = try_standard_binary_deserialization(
                            &table_commitment_with_proof.commitment, // or the correct bytes field
                        )?
                        .0;
                        Ok((table_ref, table_commitment))
                    },
                )
                .collect::<Result<_, _>>()?;

        let plan: EVMProofPlan =
            try_standard_binary_deserialization(&query_results_response.plan)?.0;
        let proof: QueryProof<CPI> =
            try_standard_binary_deserialization(&query_results_response.proof)?.0;
        let result: OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar> =
            try_standard_binary_deserialization(&query_results_response.results)?.0;

        Ok(verify_prover_via_gateway_response::<CPI>(
            proof,
            result,
            &plan,
            &[],
            &query_commitments,
            &verifier_setup,
        )?)
    }

    /// Query and verify a SQL query at the given SxT block
    ///
    /// Run a SQL query and verify the result.
    ///
    /// If `block_ref` is `None`, the latest block is used.
    pub async fn query_and_verify(
        &self,
        query: &str,
        block_ref: Option<H256>,
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
