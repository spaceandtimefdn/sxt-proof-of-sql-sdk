use crate::base::attestation::{Attestation, AttestationsResponse};
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
            "attestation_v1_attestationsForBlock",
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

#[cfg(test)]
mod tests {
    use super::*;
    use jsonrpsee::ws_client::WsClientBuilder;

    const TEST_WSS_ENDPOINT: &str = "wss://rpc.testnet.sxt.network";

    #[ignore] // This test requires network access & a functional chain and may be slow
    #[tokio::test]
    async fn test_fetch_attestation_from_testnet() {
        // Test connecting to the WSS endpoint and fetching attestation
        let client = WsClientBuilder::new()
            .build(TEST_WSS_ENDPOINT)
            .await
            .expect("Failed to connect to testnet");

        // Fetch attestation from latest block
        let (block_hash, _attestations) = fetch_attestation(&client, None)
            .await
            .expect("Failed to fetch attestation");

        assert!(!block_hash.is_zero(), "Block hash should not be zero");
    }
}
