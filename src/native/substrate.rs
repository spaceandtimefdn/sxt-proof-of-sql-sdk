use crate::base::{
    attestation::{self, create_attestation_message, verify_signature},
    sxt_chain_runtime::{
        self,
        api::{
            runtime_types::proof_of_sql_commitment_map::{
                commitment_scheme, commitment_storage_map::TableCommitmentBytes,
            },
            storage,
        },
    },
    table_ref_to_table_id, CommitmentEvaluationProofId,
};
use futures::future::try_join_all;
use itertools::Itertools;
use proof_of_sql::base::{
    commitment::{CommitmentEvaluationProof, QueryCommitments, TableCommitment},
    database::TableRef,
};
use snafu::{ResultExt, Snafu};
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

/// Errors that may occur during the attestation process.
#[derive(Debug, Snafu)]
#[allow(dead_code)]
pub enum AttestationError {
    /// Represents an error originating from the Subxt library.
    #[snafu(display("Subxt error: {source}"))]
    SubxtError { source: subxt::Error },

    /// Represents an error fetching attestations for a specific block.
    #[snafu(display(
        "There was an error reading the attestations for block {block_number} on chain"
    ))]
    ErrorFetchingAttestations { block_number: u32 },

    /// Error indicating that attestations for a block have inconsistent state roots.
    #[snafu(display("The attestations have different state roots, impossible to verify"))]
    StateRootMismatch,

    #[snafu(display("Attestation error: {source}"))]
    LocalError {
        source: attestation::AttestationError,
    },
}

/// Verifies the attestations for a given block by checking their validity and consistency.
///
/// This function performs the following steps:
/// 1. Connects to a blockchain node using the provided `url`.
/// 2. Fetches the attestations for the specified `block_number`.
/// 3. Ensures all attestations have consistent `state_root` values.
/// 4. Verifies the signature for each attestation.
///
/// # Arguments
///
/// * `url` - The URL of the blockchain node to connect to.
/// * `block_number` - The block number for which attestations need to be verified.
///
/// # Returns
///
/// Returns `Ok(())` if all attestations are valid and consistent. Otherwise, it returns an
/// `AttestationError` describing the failure.
///
/// # Errors
///
/// This function can return the following errors:
/// - `AttestationError::SubxtError`: If there is an error communicating with the blockchain node.
/// - `AttestationError::ErrorFetchingAttestations`: If the attestations for the block cannot be fetched.
/// - `AttestationError::StateRootMismatch`: If the attestations have inconsistent state roots.
/// - `AttestationError::InvalidSignature`: If a signature verification fails.
///
/// # Examples
///
/// ```rust
/// use your_crate::{verify_attestations_for_block, AttestationError};
///
/// #[tokio::main]
/// async fn main() -> Result<(), AttestationError> {
///     let url = "http://localhost:9933";
///     let block_number = 12345;
///
///     verify_attestations_for_block(url, block_number).await?;
///     println!("Attestations verified successfully!");
///     Ok(())
/// }
/// ```
#[allow(dead_code)]
pub async fn verify_attestations_for_block(
    url: &str,
    block_number: u32,
) -> Result<(), AttestationError> {
    let api = OnlineClient::<SxtConfig>::from_insecure_url(url)
        .await
        .context(SubxtSnafu)?; // Updated to SubxtErrorSnafu

    let attestations_addr = sxt_chain_runtime::api::storage()
        .attestations()
        .attestations(block_number);

    let attestations = api
        .storage()
        .at_latest()
        .await
        .context(SubxtSnafu)? // Updated to SubxtErrorSnafu
        .fetch(&attestations_addr)
        .await
        .context(SubxtSnafu)? // Updated to SubxtErrorSnafu
        .ok_or_else(|| ErrorFetchingAttestationsSnafu { block_number }.build())?;

    let attestations = attestations.0;

    if !attestations
        .iter()
        .map(|attestation| {
            let sxt_chain_runtime::api::runtime_types::sxt_core::attestation::Attestation::EthereumAttestation { state_root, ..}  = attestation;
            Some(state_root.0.as_slice())
        })
        .all_equal()
    {
        return Err(AttestationError::StateRootMismatch);
    }
    attestations
         .iter().try_for_each(|attestation| {
             let sxt_chain_runtime::api::runtime_types::sxt_core::attestation::Attestation::EthereumAttestation {
                signature,
                proposed_pub_key,
                state_root,
                ..
           } = attestation;
        let msg = create_attestation_message(state_root.0.as_slice(), block_number);
           verify_signature(&msg, signature, proposed_pub_key)
             .map_err(|err| AttestationError::LocalError { source: err })
    })
}
