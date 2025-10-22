use super::{
    commitment_scheme::CommitmentScheme,
    sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::commitment_scheme,
    zk_query_models::TableCommitmentWithProof, CommitmentEvaluationProofId,
};
use indexmap::IndexMap;
use proof_of_sql::base::{
    commitment::{CommitmentEvaluationProof, QueryCommitments, TableCommitment},
    database::TableRef,
    try_standard_binary_deserialization,
};
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

/// Extract [`QueryCommitments`] from an index map of [`TableCommitment`]s.
#[expect(clippy::type_complexity)]
pub fn extract_query_commitments_from_table_commitments_with_proof<
    CPI: CommitmentEvaluationProofId,
>(
    table_commitments_with_proof: IndexMap<String, TableCommitmentWithProof>,
) -> Result<
    QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment>,
    Box<dyn core::error::Error>,
> {
    // Convert bytes -> TableCommitment<T> and collect
    let query_commitments: QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment> =
        table_commitments_with_proof
            .into_iter()
            .map(
                |(table_id, table_commitment_with_proof)| -> Result<
                    (
                        TableRef,
                        TableCommitment<<CPI as CommitmentEvaluationProof>::Commitment>,
                    ),
                    Box<dyn core::error::Error>,
                > {
                    let table_ref = TableRef::try_from(table_id.as_str())?;
                    let table_commitment: TableCommitment<
                        <CPI as CommitmentEvaluationProof>::Commitment,
                    > = try_standard_binary_deserialization(
                        &table_commitment_with_proof.commitment, // or the correct bytes field
                    )?
                    .0;
                    Ok((table_ref, table_commitment))
                },
            )
            .collect::<Result<_, _>>()?;
    Ok(query_commitments)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(feature = "hyperkzg")]
    use proof_of_sql::proof_primitive::hyperkzg::HyperKZGCommitmentEvaluationProof;

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

    #[test]
    #[cfg(feature = "hyperkzg")]
    fn test_extract_query_commitments_from_table_commitments_with_proof() {
        // Use the table_commitments_with_proof from test_verify_attestations_with_hyper_kzg
        let mut table_commitments_with_proof = IndexMap::new();
        table_commitments_with_proof.insert(
            "ETHEREUM.BLOCKS".to_string(),
            TableCommitmentWithProof {
                commitment: hex::decode("000000000000000000000000000c2011000000000000001003b4e15a7c70fbe504638b8628d717e7afff3f733b5f1cdcc08f6b25cd4ff2f120fc19cf9ad833d764372c7b1b42b032618b82e2c521e43ebb5283593ecaf25c19454abebfa3728183fd7f9d557c51cc852945d46fa9536e7ba92804cd5cacb31a912e328996dfe65b1a1739e81254082af58b0ef8e3bce43ca75ec9ead85d3a0b9035706f0e30cfbafa5586803cc4fc1224571ade595ddff3cc60b5d8c2837f2010cd5c6c28f0ed280ddbee42991029c7d6e583b0b551c9c3a1ed0c05a12e480003055a961719b54c5e6a95a6b217d621b103fbf3026a93f737a0b8f318466c1bf0075ec0629a51fba7df9abcff2c448c632ae533893ecb3dc783b439b2d7c9264ccf84600882fe771e0dbe730586d63450394392f4e80537dbb5080e31becf1b671c159f45426ec2c838343f97b804e1850498f508ffa630d00092ecf12b742090e0f132599f69637a35ab9326f1a777751ec8e78238bbf51be73097238dc620a761b3a3f45704bdedd311357106cb32c5c9700709b04fe5d5fc5d20e94a610e1414ada45bea406ead799f48a07fd3c9c5c7849496d9582e5e0ce165a0c53e283c4faf6ef615dbc9f38bbb2b0763588793697d7469805cc92a2bc1d1d6b84306ea89369bbbdf881562270d6c1e9193af23e57c0e595be3bc416daef80870672f0bd6411d59c0de504b57d188efd14f313e0569ddc5af9d96f372aa6e551ea91ce98fff53eed8699ec7e3bcfb867efd7e45986407245bb3fedb5a7b7f742a1e2ea19193b7a0c7b909f0a35ed49f0f375c81f257b019e0e94c413609c0bb29f80dee06ef302b920892e024ae6be846e97acfbffe9a796e7b394b12979528f89f23cfba9125b94abf66bf4228880636e806dfb07690e80f51ba06dde2306b11ee04be2b243278da34217a4c3fe6ae7007d3ab79b021b1d81e1df02ec8f90d8eca09ed474ed244c356f836be4b4095fd4fdaa3f635055c7ca2307bed4ac87700400227b54ee1bc82e16cbc8eee72791df80fb1fdff7a955ae99428029360df1d141b9ca61cd2c076fbf85f4e42fc8e4b0a1dbe0eff657dbe5ca875e89a7bb36d841f417ae1ff0cb15a7ddf83c6fe53acda90a5a8cfcb9100af084da1321e803f6e290857e352582f11e6f065fed15ea9e69716dfda3b1364444a69e56ecf89d84a10539fbe349a4502942336bc2dafdbab5dcb74130bd4f94fb7293fdf5e2a59eb1e97b25b7fe0e31f513f116baa3fa6f68d197587b165a76a8a62d435c89396620c9895ea759f9fe6679b8e507a22ba13738aa5314914d8132e4e60c768bad96d05ae2f59982f6a201e6cd546e462eb46221b42456f2062971aa797d0a5551cc0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000a54494d455f5354414d5000000000090000000100000000000000070000000200000196a1640d7800000198ddf25518000000000000000c424c4f434b5f4e554d4245520000000005000000050000000200000000015615c50000000001623616000000000000000a424c4f434b5f48415348000000000b0000000000000000000000094741535f4c494d495400000000084b000000000000000000000000084741535f5553454400000000084b000000000000000000000000054d494e4552000000000b00000000000000000000000b504152454e545f48415348000000000b00000000000000000000000652455741524400000000084b0000000000000000000000000453495a45000000000500000005000000020000000000000499000000000017cdbe00000000000000115452414e53414354494f4e5f434f554e540000000004000000040000000200000000000007cb00000000000000054e4f4e4345000000000b00000000000000000000000d52454345495054535f524f4f54000000000b00000000000000000000000b534841335f554e434c4553000000000b00000000000000000000000a53544154455f524f4f54000000000b0000000000000000000000115452414e53414354494f4e535f524f4f54000000000b00000000000000000000000c554e434c45535f434f554e540000000005000000050000000200000000000000000000000000000000").unwrap(),
                merkle_proof: vec![
                    "0xc591dd7a0f71ddcdbc49bb4601c0a8ef5721c4e1aec7de08dfb95216143310ab".to_string(),
                    "0xa508cf57f9e22e629675fa8e2ef07708e3bed4d3308e4a6ec5166f00134146f6".to_string(),
                    "0x37fa633f0e1cb41b20c382f58e05f5547ef041a58c197abc6284dfc75706936b".to_string(),
                    "0x398b7fa36433b070a6c363c24c6b786383881941e760dfaecbf9802a171c34ce".to_string(),
                    "0xcc543be29599709b8d5f8b52cd6ee58da2060cf5328e52760ae68ac761412139".to_string(),
                    "0x22491678cfa13dba6c69e8f18e1b1aae340a7c52260134c1bd418fda62ed5504".to_string(),
                    "0x8f4a7c257a4ee573b2678443ab87d1eb9feeaba5853f245f5322550ad461a052".to_string(),
                    "0xc2e15ac3b9538584bf798ffc153fbd880695eeb33b9c5eb8c17852c9d8e008e3".to_string(),
                    "0x99707f09ba08de14bc32b48395d4fa2d0d830b340d26967a2f91a5386e31c9db".to_string()
                ],
            },
        );

        // Extract QueryCommitments using HyperKZG
        let result = extract_query_commitments_from_table_commitments_with_proof::<
            HyperKZGCommitmentEvaluationProof,
        >(table_commitments_with_proof);

        assert!(
            result.is_ok(),
            "Failed to extract query commitments: {:?}",
            result
        );

        let query_commitments = result.unwrap();

        // Verify that we got the correct QueryCommitments
        assert_eq!(query_commitments.len(), 1);

        // Check that the table exists
        let table_ref =
            proof_of_sql::base::database::TableRef::try_from("ETHEREUM.BLOCKS").unwrap();
        assert!(query_commitments.contains_key(&table_ref));

        // Get the TableCommitment for verification
        let table_commitment = &query_commitments[&table_ref];

        // Test that the extracted TableCommitment matches expected values
        assert_eq!(table_commitment.num_columns(), 16, "Should have 16 columns");
        assert_eq!(
            table_commitment.num_rows(),
            794641,
            "Should have 794641 rows"
        );

        // Verify specific column names exist by checking metadata
        let column_names: Vec<String> = table_commitment
            .column_commitments()
            .column_metadata()
            .keys()
            .map(|ident| ident.value.clone())
            .collect();

        let expected_columns = vec![
            "TIME_STAMP",
            "BLOCK_NUMBER",
            "BLOCK_HASH",
            "GAS_LIMIT",
            "GAS_USED",
            "MINER",
            "PARENT_HASH",
            "REWARD",
            "SIZE",
            "TRANSACTION_COUNT",
            "NONCE",
            "RECEIPTS_ROOT",
            "SHA3_UNCLES",
            "STATE_ROOT",
            "TRANSACTIONS_ROOT",
            "UNCLES_COUNT",
        ];

        for expected_col in &expected_columns {
            assert!(
                column_names.contains(&expected_col.to_string()),
                "Missing expected column: {}",
                expected_col
            );
        }

        // Verify we have exactly the expected number of columns
        assert_eq!(
            column_names.len(),
            expected_columns.len(),
            "Column count mismatch"
        );
    }

    #[test]
    fn test_verifiable_commitments_response_deserialization() {
        let json_data = r#"{
            "verifiableCommitments": {
                "ETHEREUM.BLOCKS": {
                    "commitment": "0x000000000000000000000000000c53660000000000000010016f6b164cfd1657cdd659ca96902b9e3997a03320e8daddd5a53b18120e6f7f0e688d01e3a7b9906cd1c7981022779a901dd9b6e81f75c90a77b98b321e4fdd0b4dc01446fe07aefa4533955c6f8528b618954169a2b38c61a42c6d178941b719e42475d02f37ac8eabfbff39c01840af68ad010c53d688146219be6be730890d6d4da3daa0b3f310a85920317e5458f0e131728291b4f3dc212fb79b9f3d4e0399abdd43cea580a81501c0bb023595526947513addacb5f73aa9db8c0f05512c135f15997f3ba61e5ca429e26ec7927f80a947781826180a08237008cd3fce01a9d16617636723127624213ed5a6baf3f58ec620f5b6add89cf2b4277e10fd1f23e52c703fcebd0b429e80e5380a2c2e9590863732d20cc2750d4c6b757ad61952ce3404805161977110a3ccc23ded9f5084084b8219c6646e7a79746bebcc284fcc24364f83582a482975f049172a96e00872383583424610603feadde39a0e7d2076cc34ed7826a55db6e8c28a6d8dacba78e9cf24b4e8d205861518e7d4138cccaa2f35ec25ef711fc6efc6de988a02cda93f8902d3544c2826078e1595232d0d7d6ce67b416baf41a56665a1dc481d1a9cbaa50ec67c9af1dd652b4fd1286be52ce6288ee44066e3b7295714788321e06fa2fdca848e6665fe82ff113d2ae97ebf441ca328850bcb57d46e4d7aa2387fa1be138c1a3076eba938bea8602f33af571f67604e4f9c4a4fc471dbcc6e252908f89de0452c03248d86db601e21a4bd3541c1a57d8164a7d3d6a168d335b4976f1df151e775d4b1017217623f281b7e5e801e492025c4f5cf5576c1e83d997b118cdf3768fe3fb24565797b6c2d77abac027f3c22c643f3a13b6592a5200f6e9616d16d002da4758b9415ef9c263245b805513f5dcd9cd0530b5f71d5662ca7ff1e6a6890c85674c8496b46d82149f8ac0cad101173292f6a95aaf3533e460af96a104e879f41a691756c0c912bc9f76cc65bdf410cc7754afb75660e775798348eedde23352c24c5cde340d00fab77febae94b60bfaf8cb7c591ec6bd137635d9fa6aaec7204c57a1a46b51818caed9b8fd3f21996451a38b6a1a7d34e9ddb33c0e33496cbfc2a415a3b72280a7b0abadce63606e4cd9f95c331628be2431a948258162bf8cec4db7c6fa6410907b883bdd7df3bd7ed93e296b73690307587bcf50e6b82a4bfc67b2f7d5ebd16ae8e87956144fbde14159911c1f3e4c60b68b5c8e50dbf0c5e95e8457d77ba2f6d6687e8939c9a3df645b642658a7b7fef435551982894075065b709e42926031350882749c0aa9f6b79437b4d5120be68c20a10854e304aefc0b6220d09b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000a54494d455f5354414d5000000000090000000100000000000000070000000200000196a1640d7800000198e76815d8000000000000000c424c4f434b5f4e554d4245520000000005000000050000000200000000015615c50000000001626986000000000000000a424c4f434b5f48415348000000000b0000000000000000000000094741535f4c494d495400000000084b000000000000000000000000084741535f5553454400000000084b000000000000000000000000054d494e4552000000000b00000000000000000000000b504152454e545f48415348000000000b00000000000000000000000652455741524400000000084b0000000000000000000000000453495a45000000000500000005000000020000000000000499000000000017cdbe00000000000000115452414e53414354494f4e5f434f554e540000000004000000040000000200000000000007cb00000000000000054e4f4e4345000000000b00000000000000000000000d52454345495054535f524f4f54000000000b00000000000000000000000b534841335f554e434c4553000000000b00000000000000000000000a53544154455f524f4f54000000000b0000000000000000000000115452414e53414354494f4e535f524f4f54000000000b00000000000000000000000c554e434c45535f434f554e540000000005000000050000000200000000000000000000000000000000",
                    "merkleProof": [
                        "0x36995c1d0badf75025283db6234201c85675df268be4fcc8477a1643795c559a",
                        "0xa508cf57f9e22e629675fa8e2ef07708e3bed4d3308e4a6ec5166f00134146f6",
                        "0x60628c1b71318a8d21f31502b6b1176796cb154267413fc1ca40644180ca174e",
                        "0x398b7fa36433b070a6c363c24c6b786383881941e760dfaecbf9802a171c34ce",
                        "0xd1a504aff66e64ab832ced1384036d8e84ca9e01adf00bbff4e937bb57542e1b",
                        "0xd66f367592c6be0c74cc67c80483d2c84317968b4fd78be36456fca24c3d59ab",
                        "0x2511b9997c940c7c281028104c4f8d440183c54ff674667338c28334cd542afe",
                        "0xcd8483e36cc11a45881a771c5b0219e50bd4ebd3e30d7c187388cd870048c9a0",
                        "0x18c3ef638eb70b4f741477856a4b01eeab3df05eb70489dcf6b03559f272246d"
                    ]
                }
            },
            "at": "0x76df498b9a6f509582406af39f0fa2e236420b17e5c9ccae63408eee78cdfeb5"
        }"#;

        let response: VerifiableCommitmentsResponse = serde_json::from_str(json_data).unwrap();

        assert_eq!(response.verifiable_commitments.len(), 1);
        assert!(response
            .verifiable_commitments
            .contains_key("ETHEREUM.BLOCKS"));
        assert_eq!(
            response.at,
            H256::from_slice(
                &hex::decode("76df498b9a6f509582406af39f0fa2e236420b17e5c9ccae63408eee78cdfeb5")
                    .unwrap()
            )
        );

        let commitment = &response.verifiable_commitments["ETHEREUM.BLOCKS"];
        assert_eq!(commitment.merkle_proof.len(), 9);
    }

    #[test]
    fn test_single_verifiable_commitment_deserialization() {
        let json_data = r#"{
            "commitment": "0x000000000000000000000000000c53660000000000000010016f6b164cfd1657cdd659ca96902b9e3997a03320e8daddd5a53b18120e6f7f0e688d01e3a7b9906cd1c7981022779a901dd9b6e81f75c90a77b98b321e4fdd0b4dc01446fe07aefa4533955c6f8528b618954169a2b38c61a42c6d178941b719e42475d02f37ac8eabfbff39c01840af68ad010c53d688146219be6be730890d6d4da3daa0b3f310a85920317e5458f0e131728291b4f3dc212fb79b9f3d4e0399abdd43cea580a81501c0bb023595526947513addacb5f73aa9db8c0f05512c135f15997f3ba61e5ca429e26ec7927f80a947781826180a08237008cd3fce01a9d16617636723127624213ed5a6baf3f58ec620f5b6add89cf2b4277e10fd1f23e52c703fcebd0b429e80e5380a2c2e9590863732d20cc2750d4c6b757ad61952ce3404805161977110a3ccc23ded9f5084084b8219c6646e7a79746bebcc284fcc24364f83582a482975f049172a96e00872383583424610603feadde39a0e7d2076cc34ed7826a55db6e8c28a6d8dacba78e9cf24b4e8d205861518e7d4138cccaa2f35ec25ef711fc6efc6de988a02cda93f8902d3544c2826078e1595232d0d7d6ce67b416baf41a56665a1dc481d1a9cbaa50ec67c9af1dd652b4fd1286be52ce6288ee44066e3b7295714788321e06fa2fdca848e6665fe82ff113d2ae97ebf441ca328850bcb57d46e4d7aa2387fa1be138c1a3076eba938bea8602f33af571f67604e4f9c4a4fc471dbcc6e252908f89de0452c03248d86db601e21a4bd3541c1a57d8164a7d3d6a168d335b4976f1df151e775d4b1017217623f281b7e5e801e492025c4f5cf5576c1e83d997b118cdf3768fe3fb24565797b6c2d77abac027f3c22c643f3a13b6592a5200f6e9616d16d002da4758b9415ef9c263245b805513f5dcd9cd0530b5f71d5662ca7ff1e6a6890c85674c8496b46d82149f8ac0cad101173292f6a95aaf3533e460af96a104e879f41a691756c0c912bc9f76cc65bdf410cc7754afb75660e775798348eedde23352c24c5cde340d00fab77febae94b60bfaf8cb7c591ec6bd137635d9fa6aaec7204c57a1a46b51818caed9b8fd3f21996451a38b6a1a7d34e9ddb33c0e33496cbfc2a415a3b72280a7b0abadce63606e4cd9f95c331628be2431a948258162bf8cec4db7c6fa6410907b883bdd7df3bd7ed93e296b73690307587bcf50e6b82a4bfc67b2f7d5ebd16ae8e87956144fbde14159911c1f3e4c60b68b5c8e50dbf0c5e95e8457d77ba2f6d6687e8939c9a3df645b642658a7b7fef435551982894075065b709e42926031350882749c0aa9f6b79437b4d5120be68c20a10854e304aefc0b6220d09b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000a54494d455f5354414d5000000000090000000100000000000000070000000200000196a1640d7800000198e76815d8000000000000000c424c4f434b5f4e554d4245520000000005000000050000000200000000015615c50000000001626986000000000000000a424c4f434b5f48415348000000000b0000000000000000000000094741535f4c494d495400000000084b000000000000000000000000084741535f5553454400000000084b000000000000000000000000054d494e4552000000000b00000000000000000000000b504152454e545f48415348000000000b00000000000000000000000652455741524400000000084b0000000000000000000000000453495a45000000000500000005000000020000000000000499000000000017cdbe00000000000000115452414e53414354494f4e5f434f554e540000000004000000040000000200000000000007cb00000000000000054e4f4e4345000000000b00000000000000000000000d52454345495054535f524f4f54000000000b00000000000000000000000b534841335f554e434c4553000000000b00000000000000000000000a53544154455f524f4f54000000000b0000000000000000000000115452414e53414354494f4e535f524f4f54000000000b00000000000000000000000c554e434c45535f434f554e540000000005000000050000000200000000000000000000000000000000",
            "merkleProof": [
                "0x36995c1d0badf75025283db6234201c85675df268be4fcc8477a1643795c559a",
                "0xa508cf57f9e22e629675fa8e2ef07708e3bed4d3308e4a6ec5166f00134146f6"
            ]
        }"#;

        let commitment: VerifiableCommitment = serde_json::from_str(json_data).unwrap();
        assert_eq!(commitment.merkle_proof.len(), 2);
        assert!(!commitment.commitment.0.is_empty());
    }
}
