use crate::prover::CommitmentScheme;
use proof_of_sql::{
    base::commitment::CommitmentEvaluationProof,
    proof_primitive::{
        dory::DynamicDoryEvaluationProof, hyperkzg::HyperKZGCommitmentEvaluationProof,
    },
};
use serde::{Deserialize, Serialize};

/// Trait for commitment evaluation proofs that defines their associated [`CommitmentScheme`].
pub trait CommitmentEvaluationProofId:
    CommitmentEvaluationProof + Serialize + for<'de> Deserialize<'de>
{
    /// The [`CommitmentScheme`] associated with this commitment type.
    const COMMITMENT_SCHEME: CommitmentScheme;
}

impl CommitmentEvaluationProofId for HyperKZGCommitmentEvaluationProof {
    const COMMITMENT_SCHEME: CommitmentScheme = CommitmentScheme::HyperKzg;
}
impl CommitmentEvaluationProofId for DynamicDoryEvaluationProof {
    const COMMITMENT_SCHEME: CommitmentScheme = CommitmentScheme::DynamicDory;
}
