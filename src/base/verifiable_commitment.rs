use super::{
    commitment_scheme::CommitmentScheme,
    sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::commitment_scheme,
};
use eth_merkle_tree::utils::{errors::BytesError, keccak::keccak256};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use sp_core::Bytes;
use subxt::{ext::codec::Encode, utils::H256};

/// Serialization format for a Commitment and its attestation merkle proof.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifiableCommitment {
    /// The commitment bytes.
    pub commitment: Bytes,
    /// The merkle proof.
    ///
    /// The Strings here are always hex encoded bytes.
    pub merkle_proof: Vec<String>,
}

/// Serialization format for an api response returning verifiable commitments.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifiableCommitmentsResponse {
    /// The verifiable commitments.
    pub verifiable_commitments: IndexMap<String, VerifiableCommitment>,
    /// The block hash that this query accessed storage with.
    pub at: H256,
}

/// Adapted from attestation tree code in `sxt-node`
pub fn encode_commitment_leaf(
    table_identifier: String,
    commitment_scheme: CommitmentScheme,
    table_commitment_bytes: Bytes,
) -> Result<String, BytesError> {
    let table_identifier_utf8: Vec<u8> = table_identifier.into_bytes().to_vec();
    // the table identifier length should never exceed one 127
    let table_identifier_length_prefix = table_identifier_utf8.len() as u8;
    let bytes: Vec<u8> = core::iter::once(table_identifier_length_prefix)
        .chain(table_identifier_utf8)
        .chain(commitment_scheme::CommitmentScheme::from(commitment_scheme).encode())
        .chain(table_commitment_bytes.iter().cloned())
        .collect();

    keccak256(&hex::encode(&bytes))
}
