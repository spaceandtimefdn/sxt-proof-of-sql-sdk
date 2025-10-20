use super::{
    commitment_scheme::CommitmentScheme,
    sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::commitment_scheme,
};
use subxt::ext::codec::Encode;

/// Adapted from attestation tree code in `sxt-node`
/// This replicates the exact encoding logic from [`CommitmentMapPrefixFoliate`]
///
/// # Panics
/// Panics if the table identifier length exceeds 255 bytes.
pub fn generate_commitment_leaf(
    table_identifier: String,
    commitment_scheme: CommitmentScheme,
    table_commitment_bytes: Vec<u8>,
) -> Vec<u8> {
    let table_identifier_utf8: Vec<u8> = table_identifier.into_bytes().to_vec();
    // the table identifier length should never exceed 255
    let table_identifier_length_prefix = u8::try_from(table_identifier_utf8.len())
        .expect("table identifier length should never exceed 255");

    // Encode key: [length_prefix][table_identifier_utf8][commitment_scheme_encoded]
    // Encode value: raw commitment bytes (matching sxt-node's value.data.into_inner())
    // Combine key and value (matching encode_key_value_leaf from sxt-node)
    core::iter::once(table_identifier_length_prefix)
        .chain(table_identifier_utf8)
        .chain(commitment_scheme::CommitmentScheme::from(commitment_scheme).encode())
        .chain(table_commitment_bytes)
        .collect()
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
            generate_commitment_leaf(table_identifier, commitment_scheme, table_commitment_bytes);
        let expected = vec![
            15, 69, 84, 72, 69, 82, 69, 85, 77, 46, 66, 76, 79, 67, 75, 83, 0, 1, 2, 3, 4,
        ];
        assert_eq!(actual, expected);
    }
}
