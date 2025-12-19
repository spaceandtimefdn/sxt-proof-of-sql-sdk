use crate::base::attestation::AttestationsResponse;
use jsonrpsee::{
    core::{client::ClientT, params::ArrayParams, rpc_params, ClientError},
    ws_client::WsClient,
};

/// Fetch attestations for a block hash
async fn fetch_attestation_for_block(
    client: &WsClient,
    block_hash: [u8; 32],
) -> Result<AttestationsResponse, ClientError> {
    client
        .request::<AttestationsResponse, ArrayParams>(
            "attestation_v1_attestationsForBlock",
            rpc_params![format!("0x{}", hex::encode(block_hash))],
        )
        .await
}

/// Fetch the recent block with the most attestations
async fn fetch_best_recent_attestation(
    client: &WsClient,
) -> Result<AttestationsResponse, ClientError> {
    client
        .request("attestation_v1_bestRecentAttestations", rpc_params![])
        .await
}

/// Fetch attestation
///
/// If a block hash is provided, fetch attestations for that block. Otherwise, fetch the most recent attestations
/// with the block hash.
pub async fn fetch_attestation(
    client: &WsClient,
    block_hash: Option<[u8; 32]>,
) -> Result<([u8; 32], AttestationsResponse), ClientError> {
    match block_hash {
        Some(hash) => Ok((hash, fetch_attestation_for_block(client, hash).await?)),
        None => fetch_best_recent_attestation(client)
            .await
            .map(|response| (response.attestations_for, response)),
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

        assert_ne!(block_hash, [0; 32], "Block hash should not be zero");
    }
}
