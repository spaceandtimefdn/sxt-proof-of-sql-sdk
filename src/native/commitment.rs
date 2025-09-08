use super::rpc::{fetch_attestation, fetch_verified_commitments};
use crate::base::{
    attestation::verify_attestations,
    verifiable_commitment::extract_query_commitments_from_verifiable_commitments,
    CommitmentEvaluationProofId, CommitmentScheme,
};
use jsonrpsee::ws_client::WsClientBuilder;
use proof_of_sql::base::commitment::{CommitmentEvaluationProof, QueryCommitments};
use sp_core::H256;

/// Get the verified commitments for the given tables at the given SxT block.
///
/// If `block_ref` is `None`, the latest block is used.
#[cfg_attr(not(test), expect(dead_code))]
pub async fn query_verified_commitments<CPI: CommitmentEvaluationProofId>(
    url: &str,
    serialized_proof_plan: String,
    commitment_scheme: CommitmentScheme,
    block_ref: Option<H256>,
) -> Result<
    QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment>,
    Box<dyn core::error::Error>,
> {
    let client = WsClientBuilder::new().build(url).await?;

    // Get the appropriate block hash and attestations
    let (best_block_hash, attestations) = fetch_attestation(&client, block_ref).await?;

    let verified_commitments = fetch_verified_commitments(
        &client,
        serialized_proof_plan,
        commitment_scheme,
        best_block_hash,
    )
    .await?
    .verifiable_commitments;

    // Verify the attestations
    verify_attestations(&attestations, &verified_commitments, commitment_scheme)?;
    // Extract the query commitments
    extract_query_commitments_from_verifiable_commitments::<CPI>(verified_commitments)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::base::CommitmentScheme;
    use proof_of_sql::{
        base::database::TableRef, proof_primitive::hyperkzg::HyperKZGCommitmentEvaluationProof,
    };

    const TEST_WSS_ENDPOINT: &str = "wss://rpc.testnet.sxt.network";

    #[ignore] // This test requires network access & a functional chain and may be slow
    #[tokio::test]
    async fn test_query_verified_commitments_from_testnet() {
        // Test connecting to testnet and fetching query commitments
        let serialized_proof_plan = "0x0000000000000001000000000000000f455448455245554d2e424c4f434b5300000000000000010000000000000000000000000000000c424c4f434b5f4e554d424552000000050000000000000001000000000000000c424c4f434b5f4e554d42455200000000000000000000000000000002000000000000000000000000000000010000000500000000015617d20000000000000001000000000000000000000000".to_string();

        let query_commitments = query_verified_commitments::<HyperKZGCommitmentEvaluationProof>(
            TEST_WSS_ENDPOINT,
            serialized_proof_plan,
            CommitmentScheme::HyperKzg,
            None, // Use latest block
        )
        .await
        .expect("Failed to query commitments from testnet");

        assert!(query_commitments.contains_key(&TableRef::from_names(Some("ETHEREUM"), "BLOCKS")));
    }
}
