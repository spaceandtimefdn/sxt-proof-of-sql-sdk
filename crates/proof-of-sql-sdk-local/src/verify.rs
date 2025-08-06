use crate::{
    prover::ProverResponse, uppercase_accessor::UppercaseAccessor, CommitmentEvaluationProofId,
};
use proof_of_sql::{
    base::{
        commitment::CommitmentEvaluationProof,
        database::{CommitmentAccessor, LiteralValue, OwnedTable},
    },
    sql::{
        proof::{QueryError, QueryProof},
        proof_plans::DynProofPlan,
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
    proof_plan: &DynProofPlan,
    params: &[LiteralValue],
    accessor: &impl CommitmentAccessor<<CPI as CommitmentEvaluationProof>::Commitment>,
    verifier_setup: &<CPI as CommitmentEvaluationProof>::VerifierPublicSetup<'_>,
) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, VerifyProverResponseError> {
    let accessor = UppercaseAccessor(accessor);
    let proof: QueryProof<CPI> = bincode::serde::borrow_decode_from_slice(
        &prover_response.proof,
        bincode::config::legacy()
            .with_fixed_int_encoding()
            .with_big_endian(),
    )?
    .0;
    let result: OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar> =
        bincode::serde::borrow_decode_from_slice(
            &prover_response.result,
            bincode::config::legacy()
                .with_fixed_int_encoding()
                .with_big_endian(),
        )?
        .0;

    // Verify the proof
    proof.verify(
        &CPI::associated_proof_plan(proof_plan),
        &accessor,
        result.clone(),
        verifier_setup,
        params,
    )?;
    Ok(result)
}
