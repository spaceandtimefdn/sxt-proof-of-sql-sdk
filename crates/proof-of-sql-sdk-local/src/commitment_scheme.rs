use crate::{
    prover, sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::commitment_scheme,
};
use clap::ValueEnum;
use proof_of_sql::{
    base::commitment::CommitmentEvaluationProof,
    proof_primitive::{
        dory::DynamicDoryEvaluationProof, hyperkzg::HyperKZGCommitmentEvaluationProof,
    },
};
use serde::{Deserialize, Serialize};

/// Commitment schemes used in the proof-of-sql SDK.
#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum, Serialize, Deserialize)]
pub enum CommitmentScheme {
    /// Dynamic Dory commitment scheme.
    DynamicDory,
    /// Hyper KZG commitment scheme.
    HyperKzg,
}

/// Convert a `CommitmentScheme` to a `prover::CommitmentScheme`.
impl From<CommitmentScheme> for prover::CommitmentScheme {
    fn from(scheme: CommitmentScheme) -> Self {
        match scheme {
            CommitmentScheme::DynamicDory => Self::DynamicDory,
            CommitmentScheme::HyperKzg => Self::HyperKzg,
        }
    }
}

/// Convert a `CommitmentScheme` to a `commitment_scheme::CommitmentScheme`.
impl From<CommitmentScheme> for commitment_scheme::CommitmentScheme {
    fn from(scheme: CommitmentScheme) -> Self {
        match scheme {
            CommitmentScheme::DynamicDory => Self::DynamicDory,
            CommitmentScheme::HyperKzg => Self::HyperKzg,
        }
    }
}

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
