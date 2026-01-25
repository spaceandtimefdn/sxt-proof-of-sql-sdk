use super::{get_access_token, ZkQueryClient};
use crate::{
    base::{
        serde::hex::to_hex,
        verify_from_zk_query_and_substrate_responses,
        zk_query_models::{QuerySubmitRequest, SxtNetwork},
        CommitmentEvaluationProofId, CommitmentScheme,
    },
    native::dyn_owned_table::DynOwnedTable,
};
use bumpalo::Bump;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::HyperKZGCommitmentEvaluationProof;
use proof_of_sql::{
    base::{commitment::CommitmentEvaluationProof, database::OwnedTable},
    proof_primitive::dory::DynamicDoryEvaluationProof,
};
use reqwest::Client;
use url::Url;

/// Space and Time (SxT) client
#[derive(Debug, Clone)]
pub struct SxTClient {
    /// SXT Network
    pub network: SxtNetwork,

    /// Root URL for SXT ZK Query API services
    pub zk_query_root_url: Url,

    /// Root URL for the Auth service
    pub auth_root_url: Url,

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
        zk_query_root_url: Url,
        auth_root_url: Url,
        sxt_api_key: String,
        verifier_setup: Option<String>,
    ) -> Self {
        Self {
            network,
            zk_query_root_url,
            auth_root_url,
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
        block_ref: Option<[u8; 32]>,
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

        // Run the query to get the proof plan and query results and Merkle tree
        let access_token = get_access_token(&self.sxt_api_key, self.auth_root_url.as_str()).await?;
        let client = ZkQueryClient {
            base_url: self.zk_query_root_url.clone(),
            client: Client::new(),
            access_token,
        };
        let scheme = crate::base::prover::CommitmentScheme::from(CPI::COMMITMENT_SCHEME);
        let query_results = client
            .run_zk_query(QuerySubmitRequest {
                sql_text: query.to_string(),
                source_network: SxtNetwork::Mainnet,
                timeout: None,
                commitment_scheme: Some(scheme),
                block_hash: block_ref.map(|bytes| to_hex(&bytes.to_vec())),
            })
            .await?;
        if !query_results.success {
            return Err(Box::new(std::io::Error::other(format!(
                "ZK query failed: {}",
                query_results
                    .error
                    .unwrap_or("Query failed without error".to_string())
            ))));
        }

        verify_from_zk_query_and_substrate_responses::<CPI>(query_results, &verifier_setup)
    }

    /// Query and verify a SQL query at the given SxT block
    ///
    /// Run a SQL query and verify the result.
    ///
    /// If `block_ref` is `None`, the latest block is used.
    pub async fn query_and_verify(
        &self,
        query: &str,
        block_ref: Option<[u8; 32]>,
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
