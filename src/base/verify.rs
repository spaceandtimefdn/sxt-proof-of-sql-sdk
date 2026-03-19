use super::{uppercase_accessor::UppercaseAccessor, CommitmentEvaluationProofId};
use crate::base::{
    attestation::verify_attestations,
    verifiable_commitment::extract_query_commitments_from_table_commitments_with_proof,
    zk_query_models::QueryResultsResponse,
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

pub fn verify_from_zk_query_and_substrate_responses<CPI: CommitmentEvaluationProofId>(
    query_results: QueryResultsResponse,
    verifier_setup: &<CPI as CommitmentEvaluationProof>::VerifierPublicSetup<'_>,
) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, Box<dyn core::error::Error>> {
    let table_commitment_with_proof =
        verify_attestations(&query_results.commitments, vec![], CPI::COMMITMENT_SCHEME)
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
