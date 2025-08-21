use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use sp_core::Bytes;
use subxt::utils::H256;

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
