use crate::base::{
    sxt_chain_runtime::api::{
        runtime_types::proof_of_sql_commitment_map::{
            commitment_scheme, commitment_storage_map::TableCommitmentBytes,
        },
        storage,
    },
    table_ref_to_table_id, CommitmentEvaluationProofId,
};
use futures::future::try_join_all;
use proof_of_sql::base::{
    commitment::{CommitmentEvaluationProof, QueryCommitments, TableCommitment},
    database::TableRef,
};
use subxt::{blocks::BlockRef, Config, OnlineClient, PolkadotConfig};

/// Use the standard PolkadotConfig
pub type SxtConfig = PolkadotConfig;

/// Get the commitments for the given tables at the given SxT block.
///
/// If `block_ref` is `None`, the latest block is used.
pub async fn query_commitments<BR, CPI: CommitmentEvaluationProofId>(
    table_refs: &[TableRef],
    url: &str,
    block_ref: Option<BR>,
) -> Result<
    QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment>,
    Box<dyn core::error::Error>,
>
where
    BR: Into<BlockRef<<SxtConfig as Config>::Hash>> + Clone,
{
    let api = OnlineClient::<SxtConfig>::from_insecure_url(url).await?;

    // Create a collection of futures
    let futures = table_refs.iter().map(|table_ref| {
        let api = api.clone();
        let table_ref = table_ref.clone();
        let block_ref = block_ref.clone();
        async move {
            let table_id = table_ref_to_table_id(&table_ref);
            let commitments_query = storage().commitments().commitment_storage_map(
                &table_id,
                commitment_scheme::CommitmentScheme::from(CPI::COMMITMENT_SCHEME),
            );

            let storage_at_block_ref = match block_ref {
                Some(block_ref) => api.storage().at(block_ref),
                None => api.storage().at_latest().await?,
            };

            let table_commitment_bytes: TableCommitmentBytes = storage_at_block_ref
                .fetch(&commitments_query)
                .await?
                .ok_or("Commitment not found")?;
            let table_commitments = bincode::serde::decode_from_slice(
                &table_commitment_bytes.data.0,
                bincode::config::legacy()
                    .with_fixed_int_encoding()
                    .with_big_endian(),
            )?
            .0;
            Ok::<
                (
                    TableRef,
                    TableCommitment<<CPI as CommitmentEvaluationProof>::Commitment>,
                ),
                Box<dyn core::error::Error>,
            >((table_ref.clone(), table_commitments))
        }
    });

    // Collect and await all futures concurrently
    let results = try_join_all(futures)
        .await?
        .into_iter()
        .collect::<QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment>>();
    Ok(results)
}
