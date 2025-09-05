use super::{
    commitment_scheme::CommitmentScheme,
    sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::commitment_scheme,
};
use eth_merkle_tree::utils::errors::BytesError;
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
/// This replicates the exact encoding logic from [`CommitmentMapPrefixFoliate`]
///
/// # Panics
/// Panics if the table identifier length exceeds 255 bytes.
pub fn generate_commitment_leaf(
    table_identifier: String,
    commitment_scheme: CommitmentScheme,
    table_commitment_bytes: Vec<u8>,
) -> Result<Vec<u8>, BytesError> {
    let table_identifier_utf8: Vec<u8> = table_identifier.into_bytes().to_vec();
    // the table identifier length should never exceed 255
    let table_identifier_length_prefix = u8::try_from(table_identifier_utf8.len())
        .expect("table identifier length should never exceed 255");

    // Encode key: [length_prefix][table_identifier_utf8][commitment_scheme_encoded]
    // Encode value: raw commitment bytes (matching sxt-node's value.data.into_inner())
    // Combine key and value (matching encode_key_value_leaf from sxt-node)
    Ok(core::iter::once(table_identifier_length_prefix)
        .chain(table_identifier_utf8)
        .chain(commitment_scheme::CommitmentScheme::from(commitment_scheme).encode())
        .chain(table_commitment_bytes)
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_commitment_leaf() {
        let table_identifier = "ETHEREUM.BLOCKS".to_string();
        let commitment_scheme = CommitmentScheme::HyperKzg;
        let table_commitment_bytes = vec![1, 2, 3, 4]; // Simple test data
        let actual =
            generate_commitment_leaf(table_identifier, commitment_scheme, table_commitment_bytes)
                .unwrap();
        let expected = vec![
            15, 69, 84, 72, 69, 82, 69, 85, 77, 46, 66, 76, 79, 67, 75, 83, 0, 1, 2, 3, 4,
        ];
        assert_eq!(actual, expected);
    }
}
