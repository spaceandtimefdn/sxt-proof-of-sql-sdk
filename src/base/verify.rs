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
        deserialize_attestors_from_javascript, deserialize_query_results_from_javascript,
        deserialize_verifier_key,
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
    valid_attestors: Vec<String>,
) -> Result<IndexMap<String, JSFriendlyColumn>, Failure> {
    let query_results = deserialize_query_results_from_javascript(query_results_json)?;
    let valid_attestors = deserialize_attestors_from_javascript(valid_attestors)?;
    let verifier_setup = deserialize_verifier_key();

    let result = verify_from_zk_query_and_substrate_responses::<HyperKZGCommitmentEvaluationProof>(
        query_results,
        valid_attestors,
        &&verifier_setup,
    )
    .map_err(|err| Failure::VerificationError(format!("Error verifying result: {}", err)))?;
    try_convert_table_to_javascript_friendly_table(result)
}

#[cfg(feature = "hyperkzg")]
pub fn proof_of_sql_verify_from_json_responses(
    query_results_json: String,
    valid_attestors: Vec<String>,
) -> String {
    let result =
        proof_of_sql_verify_from_json_responses_as_result(query_results_json, valid_attestors);
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
    const VALID_GATEWAY_RESPONSE: &str = include_str!("test_assets/valid_gateway_response.json");

    #[test]
    fn we_can_verify_using_json_inputs() {
        let res = proof_of_sql_verify_from_json_responses(
            VALID_GATEWAY_RESPONSE.to_string(),
            vec![
                "0x349b729d1cEeAAe54fAB5655F621750Be6FadB49".to_string(),
                "0xd347bfE3e75930c1253eF5D877FF6A5cee90D919".to_string(),
                "0x3c9260330194d2B79038d0190e6BCE7346e110a9".to_string(),
            ],
        );
        let expected_response = "{\"verificationStatus\":\"Success\",\"result\":{\"BLOCK_NUMBER\":{\"type\":\"BigInt\",\"column\":[\"22432845\"]},\"record_count\":{\"type\":\"BigInt\",\"column\":[\"1\"]}}}";
        assert_eq!(res, expected_response);
    }

    #[test]
    fn we_cannot_verify_using_json_inputs_if_attestors_are_bogus() {
        let res = proof_of_sql_verify_from_json_responses(
            VALID_GATEWAY_RESPONSE.to_string(),
            vec![
                "0x349b729d1cEeAAe54fAB5655F621750Be6FadB49".to_string(),
                "0xd347bfE3e75930c1253eF5D877FF6A5cee90D919".to_string(),
                "0x3c9260330194d2B79038d0190e6BCE7346e110a8".to_string(),
            ],
        );
        let expected_response = "{\"verificationStatus\":\"Failure\",\"error\":\"VerificationError\",\"message\":\"Error verifying result: At least one required attestor has not signed\"}";
        assert_eq!(res, expected_response);
    }

    #[test]
    fn we_can_reject_verification_using_nonsense_json_inputs() {
        let res = proof_of_sql_verify_from_json_responses("nonsense".to_string(), Vec::new());
        let expected_response = "{\"verificationStatus\":\"Failure\",\"error\":\"QueryResultsDeserialization\",\"message\":\"Error deserializing query results: expected ident at line 1 column 2\"}";
        assert_eq!(res, expected_response);
    }
}
