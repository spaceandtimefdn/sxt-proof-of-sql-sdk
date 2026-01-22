#![doc = include_str!("README.md")]

use crate::base::{
    verify_from_zk_query_and_substrate_responses, zk_query_models::QueryResultsResponse,
};
use gloo_utils::format::JsValueSerdeExt;
use nova_snark::provider::hyperkzg::VerifierKey;
use proof_of_sql::{
    base::try_standard_binary_deserialization,
    proof_primitive::hyperkzg::{HyperKZGCommitmentEvaluationProof, HyperKZGEngine},
};
use wasm_bindgen::prelude::*;

/// Proof-of-sql verifier setup serialized as bytes.
const HYPER_KZG_VERIFIER_SETUP_BYTES: &[u8; 160] =
    include_bytes!("../../verifier_setups/hyper-kzg.bin");

/// Verify a response from the prover service against the provided commitment accessor.
#[wasm_bindgen]
pub fn verify_prover_response_hyper_kzg(prover_response_json: JsValue) -> Result<JsValue, String> {
    let prover_response: QueryResultsResponse = prover_response_json
        .into_serde()
        .map_err(|e| format!("failed to deserialize prover response json: {e}"))?;

    let verifier_setup: VerifierKey<HyperKZGEngine> =
        try_standard_binary_deserialization(HYPER_KZG_VERIFIER_SETUP_BYTES)
            .map(|(setup, _)| setup)
            .map_err(|err| err.to_string())?;

    let verified_table_result: Vec<_> = verify_from_zk_query_and_substrate_responses::<
        HyperKZGCommitmentEvaluationProof,
    >(prover_response, &&verifier_setup)
    .map_err(|e| format!("verification failure: {e}"))?
    .into_inner()
    .into_iter()
    .map(|(ident, col)| (ident.to_string(), col))
    .collect();

    let verified_table_result_json = JsValue::from_serde(&verified_table_result)
        .map_err(|e| format!("failed to convert verified table result to json: {e}"))?;

    Ok(verified_table_result_json)
}
