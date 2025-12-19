#![doc = include_str!("README.md")]

use crate::base::{
    sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::{
        commitment_scheme::CommitmentScheme, commitment_storage_map::TableCommitmentBytes,
    },
    table_ref_to_table_id,
};
use ark_serialize::{CanonicalDeserialize, Compress, Validate};
use gloo_utils::format::JsValueSerdeExt;
use indexmap::IndexMap;
use proof_of_sql::{
    base::{
        commitment::{Commitment, QueryCommitments},
        database::TableRef,
        try_standard_binary_deserialization,
    },
    proof_primitive::dory::{DynamicDoryEvaluationProof, VerifierSetup},
};
use serde::Deserialize;
use sp_crypto_hashing::{blake2_128, twox_128};
use sqlparser::{dialect::GenericDialect, parser::Parser};
use subxt::ext::codec::{Decode, Encode};
use wasm_bindgen::prelude::*;

/// Proof-of-sql verifier setup serialized as bytes.

/// Verify a response from the prover service against the provided commitment accessor.
#[wasm_bindgen]
pub fn verify_prover_response_dory(
    prover_response_json: JsValue,
    proof_plan_json: JsValue,
    commitments: Vec<TableRefAndCommitment>,
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
        crate::base::verify_prover_response::<DynamicDoryEvaluationProof>(
            &prover_response,
            &proof_plan,
            &[],
            &query_commitments,
            &&*DYNAMIC_DORY_VERIFIER_SETUP,
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
