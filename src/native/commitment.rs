use super::rpc::{fetch_attestation, fetch_verified_commitments};
use crate::base::{
    verifiable_commitment::encode_commitment_leaf, CommitmentEvaluationProofId, CommitmentScheme,
};
use eth_merkle_tree::utils::{errors::BytesError, verify::verify_proof};
use itertools::{process_results, Itertools};
use jsonrpsee::ws_client::WsClientBuilder;
use proof_of_sql::base::{
    commitment::{CommitmentEvaluationProof, QueryCommitments, TableCommitment},
    database::TableRef,
};
use snafu::Snafu;
use sp_core::H256;

/// Errors that can occur during attestation.
#[derive(Debug, Snafu)]
pub enum AttestationError {
    /// Error related to internals of Merkle tree-related computations.
    #[snafu(display("Bytes error: {:?}", source))]
    BytesError { source: BytesError },
    /// No state root present in the attestation.
    #[snafu(display("No state root present"))]
    NoStateRoot,
    /// Failure to verify Merkle proof for commitments.
    #[snafu(display("Failed to verify Merkle proof"))]
    FailureToVerifyMerkleProof,
}

impl From<BytesError> for AttestationError {
    fn from(source: BytesError) -> Self {
        AttestationError::BytesError { source }
    }
}

/// Get the commitments for the given tables at the given SxT block.
///
/// If `block_ref` is `None`, the latest block is used.
#[expect(dead_code, clippy::type_complexity)]
pub async fn query_commitments<CPI: CommitmentEvaluationProofId>(
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

    // Now verify for each attestation and every commitment
    let attested = process_results(
        attestations
            .into_iter()
            .cartesian_product(verified_commitments.clone().into_iter())
            .map(
                |(attestation, (table_id, verified_commitment))| -> Result<bool, AttestationError> {
                    let root = attestation
                        .state_root()
                        .ok_or(AttestationError::NoStateRoot)?;
                    let encoded_root = hex::encode(&root);
                    let leaf = encode_commitment_leaf(
                        table_id,
                        commitment_scheme,
                        verified_commitment.commitment, // keep this consistent with your encode/decode
                    )?;
                    Ok(verify_proof(
                        verified_commitment.merkle_proof.clone(),
                        &encoded_root,
                        &leaf,
                    )?)
                },
            ),
        |mut iter| iter.all(|ok| ok),
    )?;

    if !attested {
        return Err(AttestationError::FailureToVerifyMerkleProof.into());
    }

    // Convert bytes -> TableCommitment<T> and collect
    let out: QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment> =
        verified_commitments
            .into_iter()
            .map(
                |(table_id, verified_commitment)| -> Result<
                    (
                        TableRef,
                        TableCommitment<<CPI as CommitmentEvaluationProof>::Commitment>,
                    ),
                    Box<dyn core::error::Error>,
                > {
                    let table_ref = TableRef::try_from(table_id.as_str())?;
                    let table_commitment: TableCommitment<
                        <CPI as CommitmentEvaluationProof>::Commitment,
                    > = bincode::serde::decode_from_slice(
                        &verified_commitment.commitment, // or the correct bytes field
                        bincode::config::legacy()
                            .with_fixed_int_encoding()
                            .with_big_endian(),
                    )?
                    .0;
                    Ok((table_ref, table_commitment))
                },
            )
            .collect::<Result<_, _>>()?;

    Ok(out)
}
