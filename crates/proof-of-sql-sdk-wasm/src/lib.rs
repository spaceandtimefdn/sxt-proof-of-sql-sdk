#![doc = include_str!("../README.md")]

use ark_serialize::{CanonicalDeserialize, Compress, Validate};
use gloo_utils::format::JsValueSerdeExt;
use indexmap::IndexMap;
use nova_snark::provider::hyperkzg::VerifierKey;
use proof_of_sql::{
    base::{
        commitment::{Commitment, CommitmentEvaluationProof, QueryCommitments},
        database::TableRef,
    },
    proof_primitive::{
        dory::{DynamicDoryEvaluationProof, VerifierSetup},
        hyperkzg::{HyperKZGCommitmentEvaluationProof, HyperKZGEngine},
    },
};
use serde::Deserialize;
use sp_crypto_hashing::{blake2_128, twox_128};
use sqlparser::{dialect::GenericDialect, parser::Parser};
use subxt::ext::codec::{Decode, Encode};
use sxt_proof_of_sql_sdk_local::{
    sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::{
        commitment_scheme, commitment_storage_map::TableCommitmentBytes,
    },
    table_ref_to_table_id, CommitmentEvaluationProofId,
};
use wasm_bindgen::prelude::*;

/// Proof-of-sql verifier setup serialized as bytes.
const DYNAMIC_DORY_VERIFIER_SETUP_BYTES: &[u8; 47472] =
    include_bytes!("../../../verifier_setups/dynamic_dory.bin");
const HYPERKZG_VERIFIER_SETUP_BYTES: &[u8; 160] =
    include_bytes!("../../../verifier_setups/hyperkzg.bin");

lazy_static::lazy_static! {
    /// Proof-of-sql verifier setup.
    static ref DYNAMIC_DORY_VERIFIER_SETUP: VerifierSetup = VerifierSetup::deserialize_with_mode(
        &DYNAMIC_DORY_VERIFIER_SETUP_BYTES[..],
        Compress::No,
        Validate::No,
    )
    .unwrap();
}

lazy_static::lazy_static! {
    /// HyperKZG verifier setup.
    static ref HYPERKZG_VERIFIER_SETUP: VerifierKey<HyperKZGEngine> =
    bincode::serde::decode_from_slice(
        &HYPERKZG_VERIFIER_SETUP_BYTES[..],
        bincode::config::legacy()
            .with_fixed_int_encoding()
            .with_big_endian(),
    ).unwrap().0;
}

/// Compute the sxt chain storage key for the commitment of the given table.
pub fn commitment_storage_key<CPI: CommitmentEvaluationProofId>(
    table_ref: &str,
) -> Result<String, String> {
    let table_ref: TableRef = table_ref
        .try_into()
        .map_err(|e| format!("failed to parse table ref: {e}"))?;

    let table_id = table_ref_to_table_id(&table_ref);

    let encoded_table_id = table_id.encode();

    let encoded_commitment_scheme =
        commitment_scheme::CommitmentScheme::from(CPI::COMMITMENT_SCHEME).encode();

    let storage_key = twox_128(b"Commitments")
        .into_iter()
        .chain(twox_128(b"CommitmentStorageMap"))
        .chain(blake2_128(&encoded_table_id))
        .chain(encoded_table_id)
        .chain(blake2_128(&encoded_commitment_scheme))
        .chain(encoded_commitment_scheme)
        .collect::<Vec<_>>();

    Ok(hex::encode(storage_key))
}

#[wasm_bindgen]
pub fn commitment_storage_key_dory(table_ref: &str) -> Result<String, String> {
    commitment_storage_key::<DynamicDoryEvaluationProof>(table_ref)
}

#[wasm_bindgen]
pub fn commitment_storage_key_hyperkzg(table_ref: &str) -> Result<String, String> {
    commitment_storage_key::<HyperKZGCommitmentEvaluationProof>(table_ref)
}

/// A table and its associated commitment.
#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TableRefAndCommitment {
    /// Table ref as a string (like "namespace.name").
    table_ref: String,
    /// Table commitment as a hex-encoded TableCommitmentBytes, without the leading "0x".
    table_commitment_hex: String,
}

#[wasm_bindgen]
impl TableRefAndCommitment {
    /// Construct a [`TableRefAndCommitment`].
    ///
    /// Does not perform any validation of the strings.
    #[wasm_bindgen(constructor)]
    pub fn new(table_ref: String, table_commitment_hex: String) -> Self {
        TableRefAndCommitment {
            table_ref,
            table_commitment_hex,
        }
    }
}

/// Collects an iterator of [`TableRefAndCommitment`] into proof-of-sql QueryCommitments.
fn query_commitments_from_table_ref_and_commitment_iter<'a, C>(
    iter: impl IntoIterator<Item = &'a TableRefAndCommitment>,
) -> Result<QueryCommitments<C>, String>
where
    for<'de> C: Commitment + Deserialize<'de>,
{
    iter.into_iter()
        .map(
            |TableRefAndCommitment {
                 table_ref,
                 table_commitment_hex,
             }| {
                let table_ref = table_ref
                    .parse()
                    .map_err(|e| format!("failed to parse table ref: {e}"))?;
                let table_commitment_bytes = TableCommitmentBytes::decode(
                    &mut hex::decode(table_commitment_hex)
                        .map_err(|e| format!("failed to decode table commitment hex: {e}"))?
                        .as_slice(),
                )
                .map_err(|e| format!("failed to decode table commitment bytes: {e}"))?;

                let table_commitment = bincode::serde::decode_from_slice(
                    &table_commitment_bytes.data.0,
                    bincode::config::legacy()
                        .with_fixed_int_encoding()
                        .with_big_endian(),
                )
                .map_err(|e| format!("failed to deserialize table commitment using bincode: {e}"))?
                .0;
                Ok((table_ref, table_commitment))
            },
        )
        .collect()
}

/// Prover query and intermediate results produced by [`plan_prover_query`].
#[wasm_bindgen(getter_with_clone)]
pub struct ProverQueryAndQueryExprAndCommitments {
    /// Prover query json that can be used as the body data of a prover request.
    pub prover_query_json: JsValue,
    /// Proof-of-sql query expr (parsed sql) serialized as json.
    pub proof_plan_json: JsValue,
    /// Proof-of-sql commitments passed into [`plan_prover_query`].
    ///
    /// This binding does not logically require taking ownership of the commitments.
    /// However, collections cannot be passed in by reference across the wasm boundary.
    /// Returning the original commitments allows the caller to reuse them without cloning.
    pub commitments: Vec<TableRefAndCommitment>,
}

/// Create a query for the prover service from sql query text and commitments.
pub fn plan_prover_query<CPI: CommitmentEvaluationProofId>(
    query: &str,
    commitments: Vec<TableRefAndCommitment>,
) -> Result<ProverQueryAndQueryExprAndCommitments, String> {
    let dialect = GenericDialect {};
    let query_parsed = Parser::parse_sql(&dialect, query)
        .map_err(|e| format!("failed to parse sql query: {e}"))?[0]
        .clone();
    let query_commitments = query_commitments_from_table_ref_and_commitment_iter(&commitments)
        .map_err(|e| format!("failed to construct QueryCommitments: {e}"))?;

    let (prover_query, proof_plan_with_post_processing) =
        sxt_proof_of_sql_sdk_local::plan_prover_query::<CPI>(&query_parsed, &query_commitments)
            .map_err(|e| format!("failed to plan prover query: {e}"))?;

    let prover_query_json = JsValue::from_serde(&prover_query)
        .map_err(|e| format!("failed to convert prover query to json: {e}"))?;

    let proof_plan_json = JsValue::from_serde(&proof_plan_with_post_processing.plan())
        .map_err(|e| format!("failed to convert query expr to json: {e}"))?;

    let result = ProverQueryAndQueryExprAndCommitments {
        prover_query_json,
        proof_plan_json,
        commitments,
    };

    Ok(result)
}

#[wasm_bindgen]
pub fn plan_prover_query_dory(
    query: &str,
    commitments: Vec<TableRefAndCommitment>,
) -> Result<ProverQueryAndQueryExprAndCommitments, String> {
    plan_prover_query::<DynamicDoryEvaluationProof>(query, commitments)
}

#[wasm_bindgen]
pub fn plan_prover_query_hyperkzg(
    query: &str,
    commitments: Vec<TableRefAndCommitment>,
) -> Result<ProverQueryAndQueryExprAndCommitments, String> {
    plan_prover_query::<HyperKZGCommitmentEvaluationProof>(query, commitments)
}

/// Verify a response from the prover service against the provided commitment accessor.
pub fn verify_prover_response<CPI: CommitmentEvaluationProofId>(
    prover_response_json: JsValue,
    proof_plan_json: JsValue,
    commitments: Vec<TableRefAndCommitment>,
    verifier_setup: <CPI as CommitmentEvaluationProof>::VerifierPublicSetup<'_>,
) -> Result<JsValue, String> {
    let prover_response = prover_response_json
        .into_serde()
        .map_err(|e| format!("failed to deserialize prover response json: {e}"))?;

    let proof_plan = proof_plan_json
        .into_serde()
        .map_err(|e| format!("failed to deserialize proof plan json: {e}"))?;

    let query_commitments = query_commitments_from_table_ref_and_commitment_iter(&commitments)
        .map_err(|e| format!("failed to construct QueryCommitments: {e}"))?;

    let verified_table_result: IndexMap<_, _> =
        sxt_proof_of_sql_sdk_local::verify_prover_response::<CPI>(
            &prover_response,
            &proof_plan,
            &[],
            &query_commitments,
            &verifier_setup,
        )
        .map_err(|e| format!("verification failure: {e}"))?
        .into_inner()
        .into_iter()
        .map(|(ident, col)| (ident.to_string(), col))
        .collect();

    let verified_table_result_json = JsValue::from_serde(&verified_table_result)
        .map_err(|e| format!("failed to convert verified table result to json: {e}"))?;

    Ok(verified_table_result_json)
}

#[wasm_bindgen]
pub fn verify_prover_response_dory(
    prover_response_json: JsValue,
    proof_plan_json: JsValue,
    commitments: Vec<TableRefAndCommitment>,
) -> Result<JsValue, String> {
    verify_prover_response::<DynamicDoryEvaluationProof>(
        prover_response_json,
        proof_plan_json,
        commitments,
        &DYNAMIC_DORY_VERIFIER_SETUP,
    )
}

#[wasm_bindgen]
pub fn verify_prover_response_hyperkzg(
    prover_response_json: JsValue,
    proof_plan_json: JsValue,
    commitments: Vec<TableRefAndCommitment>,
) -> Result<JsValue, String> {
    verify_prover_response::<HyperKZGCommitmentEvaluationProof>(
        prover_response_json,
        proof_plan_json,
        commitments,
        &HYPERKZG_VERIFIER_SETUP,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn storage_key_is_correct() {
        let expected = "ca407206ec1ab726b2636c4b145ac28749505e273536fae35330b966dac69e86a4832a125c0464e066dd20add960efb518424c4f434b5320455448455245554d4a9e6f9b8d43f6ad008f8c291929dee201";

        let actual = commitment_storage_key_dory("ETHEREUM.BLOCKS").unwrap();

        assert_eq!(actual, expected);
    }
}
