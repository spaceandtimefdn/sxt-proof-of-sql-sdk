use crate::sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::commitment_scheme::CommitmentScheme;
use proof_of_sql::{
    base::commitment::CommitmentEvaluationProof,
    proof_primitive::{
        dory::DynamicDoryEvaluationProof, hyperkzg::HyperKZGCommitmentEvaluationProof,
    },
};
use serde::{Deserialize, Serialize};

const DYNAMIC_DORY_SCHEME_VALUE: i32 = 1;
const HYPERKZG_SCHEME_VALUE: i32 = 2;

/// Trait for commitment evaluation proofs that defines their associated [`CommitmentScheme`].
pub trait CommitmentEvaluationProofId:
    CommitmentEvaluationProof + Serialize + for<'de> Deserialize<'de>
{
    /// The [`CommitmentScheme`] associated with this commitment type.
    const COMMITMENT_SCHEME: CommitmentScheme;

    /// The numeric value of the commitment scheme in protobuf.
    const COMMITMENT_SCHEME_VALUE: i32;
}

impl CommitmentEvaluationProofId for HyperKZGCommitmentEvaluationProof {
    const COMMITMENT_SCHEME: CommitmentScheme = CommitmentScheme::HyperKzg;
    const COMMITMENT_SCHEME_VALUE: i32 = HYPERKZG_SCHEME_VALUE;
}
impl CommitmentEvaluationProofId for DynamicDoryEvaluationProof {
    const COMMITMENT_SCHEME: CommitmentScheme = CommitmentScheme::DynamicDory;
    const COMMITMENT_SCHEME_VALUE: i32 = DYNAMIC_DORY_SCHEME_VALUE;
}
