use super::{uppercase_accessor::UppercaseAccessor, CommitmentEvaluationProofId};
#[cfg(feature = "hyperkzg")]
use crate::base::commitment_scheme::HYPER_KZG_VERIFIER_SETUP_BYTES;
use crate::base::{
    attestation::verify_attestations,
    verifiable_commitment::extract_query_commitments_from_table_commitments_with_proof,
    zk_query_models::QueryResultsResponse,
};
#[cfg(feature = "hyperkzg")]
use nova_snark::provider::hyperkzg::VerifierKey;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::{
    BNScalar, HyperKZGCommitmentEvaluationProof, HyperKZGEngine,
};
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
) -> Result<OwnedTable<BNScalar>, String> {
    use crate::base::serde::hex::from_hex;

    let query_results: QueryResultsResponse = serde_json::from_str(&query_results_json)
        .map_err(|err| format!("Error deserializing query results: {}", err.to_string()))?;
    let valid_attestors = valid_attestors
        .iter()
        .map(|attestor| from_hex(attestor).map_err(|err| err.to_string()))
        .collect::<Result<Vec<_>, _>>()?;
    let verifier_setup: VerifierKey<HyperKZGEngine> =
        try_standard_binary_deserialization(HYPER_KZG_VERIFIER_SETUP_BYTES)
            .map_err(|err| err.to_string())
            .unwrap()
            .0;

    verify_from_zk_query_and_substrate_responses::<HyperKZGCommitmentEvaluationProof>(
        query_results,
        valid_attestors,
        &&verifier_setup,
    )
    .map_err(|err| format!("Error verifying result: {}", err.to_string()))
}

#[cfg(feature = "hyperkzg")]
pub fn proof_of_sql_verify_from_json_responses(
    query_results_json: String,
    valid_attestors: Vec<String>,
) -> String {
    let result =
        proof_of_sql_verify_from_json_responses_as_result(query_results_json, valid_attestors);
    crate::base::serde::result_table_to_json::convert_result_to_json(result).unwrap()
}

pub fn verify_from_zk_query_and_substrate_responses<CPI: CommitmentEvaluationProofId>(
    query_results: QueryResultsResponse,
    required_attestors: Vec<Vec<u8>>,
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
