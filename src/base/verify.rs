use super::{uppercase_accessor::UppercaseAccessor, CommitmentEvaluationProofId};
use crate::base::prover::ProverResponse;
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

/// Verify a response from the prover service against the provided commitment accessor.
pub fn verify_prover_response<CPI: CommitmentEvaluationProofId>(
    prover_response: &ProverResponse,
    proof_plan: &EVMProofPlan,
    params: &[LiteralValue],
    accessor: &impl CommitmentAccessor<<CPI as CommitmentEvaluationProof>::Commitment>,
    verifier_setup: &<CPI as CommitmentEvaluationProof>::VerifierPublicSetup<'_>,
) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, VerifyProverResponseError> {
    let accessor = UppercaseAccessor(accessor);
    let proof: QueryProof<CPI> = try_standard_binary_deserialization(&prover_response.proof)?.0;
    let result: OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar> =
        try_standard_binary_deserialization(&prover_response.result)?.0;

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
