use crate::{prover::ProverResponse, uppercase_accessor::UppercaseAccessor};
use proof_of_sql::{
    base::{
        commitment::CommitmentEvaluationProof,
        database::{CommitmentAccessor, LiteralValue, OwnedTable},
    },
    sql::{
        evm_proof_plan::EVMProofPlan,
        proof::{QueryError, QueryProof},
        proof_plans::DynProofPlan,
    },
};
use serde::Deserialize;
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
pub fn verify_prover_response<'de, 's, CP: CommitmentEvaluationProof + Deserialize<'de>>(
    prover_response: &'de ProverResponse,
    proof_plan: &EVMProofPlan,
    params: &[LiteralValue],
    accessor: &impl CommitmentAccessor<CP::Commitment>,
    verifier_setup: &CP::VerifierPublicSetup<'s>,
) -> Result<OwnedTable<CP::Scalar>, VerifyProverResponseError> {
    let accessor = UppercaseAccessor(accessor);
    let proof: QueryProof<CP> = bincode::serde::borrow_decode_from_slice(
        &prover_response.proof,
        bincode::config::legacy()
            .with_fixed_int_encoding()
            .with_big_endian(),
    )?
    .0;
    let result: OwnedTable<CP::Scalar> = bincode::serde::borrow_decode_from_slice(
        &prover_response.result,
        bincode::config::legacy()
            .with_fixed_int_encoding()
            .with_big_endian(),
    )?
    .0;

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
