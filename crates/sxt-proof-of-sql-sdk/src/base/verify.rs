use super::{uppercase_accessor::UppercaseAccessor, CommitmentEvaluationProofId};
use crate::base::{
    attestation::verify_attestations,
    verifiable_commitment::extract_query_commitments_from_table_commitments_with_proof,
    zk_query_models::QueryResultsResponse,
};
#[cfg(feature = "hyperkzg")]
use crate::base::{
    javascript_friendly_types::{
        try_convert_table_to_javascript_friendly_table, Failure, JSFriendlyColumn,
    },
    serde::javascript_serializations::{
        deserialize_query_results_from_javascript, deserialize_verifier_key,
        deserialize_verifying_configuration_from_javascript,
    },
};
#[cfg(feature = "hyperkzg")]
use indexmap::IndexMap;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::HyperKZGCommitmentEvaluationProof;
use proof_of_sql::{
    base::{
        commitment::CommitmentEvaluationProof,
        database::{CommitmentAccessor, LiteralValue, OwnedTable},
        try_standard_binary_deserialization,
    },
    sql::{
        evm_proof_plan::EVMProofPlan,
        proof::{QueryError, QueryProof},
    },
};
use snafu::Snafu;

/// Errors that can occur when verifying a prover response.
#[derive(Snafu, Debug)]
pub enum VerifyProverResponseError {
    /// Unable to deserialize verifiable query result.
    #[snafu(display("unable to deserialize verifiable query result: {error}"))]
    VerifiableResultDeserialization { error: bincode::error::DecodeError },
    /// Failed to interpret or verify query results.
    #[snafu(
        display("failed to interpret or verify query results: {source}"),
        context(false)
    )]
    Verification { source: QueryError },
}

impl From<bincode::error::DecodeError> for VerifyProverResponseError {
    fn from(error: bincode::error::DecodeError) -> Self {
        VerifyProverResponseError::VerifiableResultDeserialization { error }
    }
}

/// Verify a response from the prover service (via the gateway) against the provided commitment accessor.
pub fn verify_prover_via_gateway_response<CPI: CommitmentEvaluationProofId>(
    proof: QueryProof<CPI>,
    result: OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>,
    proof_plan: &EVMProofPlan,
    params: &[LiteralValue],
    accessor: &impl CommitmentAccessor<<CPI as CommitmentEvaluationProof>::Commitment>,
    verifier_setup: &<CPI as CommitmentEvaluationProof>::VerifierPublicSetup<'_>,
) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, VerifyProverResponseError> {
    let accessor = UppercaseAccessor(accessor);

    // Verify the proof
    proof.verify(
        proof_plan,
        &accessor,
        result.clone(),
        verifier_setup,
        params,
    )?;
    Ok(result)
}

#[cfg(feature = "hyperkzg")]
fn proof_of_sql_verify_from_json_responses_as_result(
    query_results_json: String,
    verifying_configuration: String,
) -> Result<IndexMap<String, JSFriendlyColumn>, Failure> {
    let query_results = deserialize_query_results_from_javascript(query_results_json)?;
    let verifying_configuration =
        deserialize_verifying_configuration_from_javascript(verifying_configuration)?;
    if &query_results.plan != verifying_configuration.proof_plan() {
        return Err(Failure::VerificationError(
            "Proof plan in query results does not match proof plan in verifying configuration"
                .to_string(),
        ));
    }
    let verifier_setup = deserialize_verifier_key();

    let result = verify_from_zk_query_and_substrate_responses::<HyperKZGCommitmentEvaluationProof>(
        query_results,
        verifying_configuration.valid_attestors(),
        &&verifier_setup,
    )
    .map_err(|err| Failure::VerificationError(format!("Error verifying result: {}", err)))?;
    try_convert_table_to_javascript_friendly_table(result)
}

#[cfg(feature = "hyperkzg")]
pub fn proof_of_sql_verify_from_json_responses(
    query_results_json: String,
    verifying_configuration: String,
) -> String {
    let result = proof_of_sql_verify_from_json_responses_as_result(
        query_results_json,
        verifying_configuration,
    );
    crate::base::serde::javascript_serializations::serialize_javascript_friendly_type(result.into())
}

pub fn verify_from_zk_query_and_substrate_responses<CPI: CommitmentEvaluationProofId>(
    query_results: QueryResultsResponse,
    required_attestors: Vec<[u8; 20]>,
    verifier_setup: &<CPI as CommitmentEvaluationProof>::VerifierPublicSetup<'_>,
) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, Box<dyn core::error::Error>> {
    let table_commitment_with_proof = verify_attestations(
        &query_results.commitments,
        required_attestors,
        CPI::COMMITMENT_SCHEME,
    )
    .map_err(|err| err.to_string())?;

    let query_commitments = extract_query_commitments_from_table_commitments_with_proof::<CPI>(
        table_commitment_with_proof,
    )?;
    let uppercased_query_commitments = UppercaseAccessor(&query_commitments);
    let plan: EVMProofPlan = try_standard_binary_deserialization(&query_results.plan)?.0;
    let proof: QueryProof<CPI> = try_standard_binary_deserialization(&query_results.proof)?.0;
    let result: OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar> =
        try_standard_binary_deserialization(&query_results.results)?.0;

    Ok(verify_prover_via_gateway_response::<CPI>(
        proof,
        result,
        &plan,
        &[],
        &uppercased_query_commitments,
        verifier_setup,
    )
    .map_err(|err| err.to_string())?)
}

#[cfg(test)]
#[cfg(feature = "hyperkzg")]
mod tests {
    use crate::base::proof_of_sql_verify_from_json_responses;
    const VALID_GATEWAY_RESPONSE: &str =
        include_str!("../../../../test_assets/valid_gateway_response.json");

    #[test]
    fn we_can_verify_using_json_inputs() {
        let res = proof_of_sql_verify_from_json_responses(
            VALID_GATEWAY_RESPONSE.to_string(),
            serde_json::json!({
                "validAttestors": [
                    "0x349b729d1cEeAAe54fAB5655F621750Be6FadB49",
                    "0xd347bfE3e75930c1253eF5D877FF6A5cee90D919",
                    "0x3c9260330194d2B79038d0190e6BCE7346e110a9"
                ],
                "proofPlan": "0x0000000000000001000000000000000f455448455245554d2e424c4f434b5300000000000000010000000000000000000000000000000c424c4f434b5f4e554d424552000000050000000000000002000000000000000c424c4f434b5f4e554d424552000000000000000c7265636f72645f636f756e74000000030000000400000003000000090000000200000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000010000000000000000000000000000000131000000000000000200000000000000000000000000000000000000000000000100000000000000000100000000000000010000000000000002000000000000000000000000000000000000000000000001"
            }).to_string()
        );
        let expected_response = "{\"verificationStatus\":\"Success\",\"result\":{\"BLOCK_NUMBER\":{\"type\":\"BigInt\",\"column\":[\"22432845\"]},\"record_count\":{\"type\":\"BigInt\",\"column\":[\"1\"]}}}";
        assert_eq!(res, expected_response);
    }

    #[test]
    fn we_cannot_verify_using_json_inputs_if_plan_mismatch() {
        let res = proof_of_sql_verify_from_json_responses(
            VALID_GATEWAY_RESPONSE.to_string(),
            serde_json::json!({
                "validAttestors": [
                    "0x349b729d1cEeAAe54fAB5655F621750Be6FadB49",
                    "0xd347bfE3e75930c1253eF5D877FF6A5cee90D919",
                    "0x3c9260330194d2B79038d0190e6BCE7346e110a9"
                ],
                "proofPlan": "0x01"
            })
            .to_string(),
        );
        let expected_response = "{\"verificationStatus\":\"Failure\",\"error\":\"VerificationError\",\"message\":\"Proof plan in query results does not match proof plan in verifying configuration\"}";
        assert_eq!(res, expected_response);
    }

    #[test]
    fn we_cannot_verify_using_json_inputs_if_attestors_are_bogus() {
        let res = proof_of_sql_verify_from_json_responses(
            VALID_GATEWAY_RESPONSE.to_string(),
            serde_json::json!({
                "validAttestors": [
                    "0x349b729d1cEeAAe54fAB5655F621750Be6FadB49",
                    "0xd347bfE3e75930c1253eF5D877FF6A5cee90D919",
                    "0x3c9260330194d2B79038d0190e6BCE7346e110a8"
                ],
                "proofPlan": "0x0000000000000001000000000000000f455448455245554d2e424c4f434b5300000000000000010000000000000000000000000000000c424c4f434b5f4e554d424552000000050000000000000002000000000000000c424c4f434b5f4e554d424552000000000000000c7265636f72645f636f756e74000000030000000400000003000000090000000200000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000010000000000000000000000000000000131000000000000000200000000000000000000000000000000000000000000000100000000000000000100000000000000010000000000000002000000000000000000000000000000000000000000000001"
            }).to_string()
        );
        let expected_response = "{\"verificationStatus\":\"Failure\",\"error\":\"VerificationError\",\"message\":\"Error verifying result: At least one required attestor has not signed\"}";
        assert_eq!(res, expected_response);
    }

    #[test]
    fn we_can_reject_verification_using_nonsense_json_inputs() {
        let res =
            proof_of_sql_verify_from_json_responses("nonsense".to_string(), "nonsense".to_string());
        let expected_response = "{\"verificationStatus\":\"Failure\",\"error\":\"QueryResultsDeserialization\",\"message\":\"Error deserializing query results: expected ident at line 1 column 2\"}";
        assert_eq!(res, expected_response);
    }
}
