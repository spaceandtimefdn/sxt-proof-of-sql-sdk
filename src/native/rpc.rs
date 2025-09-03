use crate::base::{
    attestation::{Attestation, AttestationsResponse},
    verifiable_commitment::VerifiableCommitmentsResponse,
    CommitmentScheme, ProofPlanResponse,
};
use jsonrpsee::{
    core::{client::ClientT, params::ArrayParams, rpc_params, ClientError},
    ws_client::WsClient,
};
use subxt::utils::H256;

/// Fetch attestations for a block hash
async fn fetch_attestation_for_block(
    client: &WsClient,
    block_hash: H256,
) -> Result<Vec<Attestation>, ClientError> {
    let response = client
        .request::<AttestationsResponse, ArrayParams>(
            "attestation_v1_getByBlockHash",
            rpc_params![format!("{block_hash:#x}")],
        )
        .await?;

    Ok(response.attestations)
}

/// Fetch the recent block with the most attestations
async fn fetch_best_recent_attestation(
    client: &WsClient,
) -> Result<(H256, Vec<Attestation>), ClientError> {
    let attestation_response: AttestationsResponse = client
        .request("attestation_v1_bestRecentAttestations", rpc_params![])
        .await?;
    Ok((
        attestation_response.attestations_for,
        attestation_response.attestations,
    ))
}

/// Fetch attestation
///
/// If a block hash is provided, fetch attestations for that block. Otherwise, fetch the most recent attestations
/// with the block hash.
pub async fn fetch_attestation(
    client: &WsClient,
    block_hash: Option<H256>,
) -> Result<(H256, Vec<Attestation>), ClientError> {
    match block_hash {
        Some(hash) => Ok((hash, fetch_attestation_for_block(client, hash).await?)),
        None => fetch_best_recent_attestation(client).await,
    }
}

/// Fetch verified commitments for a given `ProofPlan` and `CommitmentScheme` at a given block.
pub async fn fetch_verified_commitments(
    client: &WsClient,
    serialized_proof_plan: String,
    commitment_scheme: CommitmentScheme,
    block_hash: H256,
) -> Result<VerifiableCommitmentsResponse, ClientError> {
    let response = client
        .request::<VerifiableCommitmentsResponse, ArrayParams>(
            "commitments_v1_verifiableCommitmentsForProofPlan",
            rpc_params![
                serialized_proof_plan,
                commitment_scheme.to_string(),
                format!("{block_hash:#x}")
            ],
        )
        .await?;
    Ok(response)
}

/// Fetch proof plan for a given query at a given block.
pub async fn get_proof_plan(
    client: &WsClient,
    query: String,
    block_hash: Option<H256>,
) -> Result<ProofPlanResponse, ClientError> {
    let response = client
        .request::<ProofPlanResponse, ArrayParams>(
            "commitments_v1_proofPlan",
            rpc_params![query, block_hash.map(|h| format!("{h:#x}"))],
        )
        .await?;
    Ok(response)
}
