#![doc = include_str!("README.md")]

pub(crate) mod serde;

mod commitment_scheme;
pub use commitment_scheme::{CommitmentEvaluationProofId, CommitmentScheme, DynOwnedTable};

mod proof_plan;
pub use proof_plan::get_plan_from_accessor_and_query;

mod uppercase_accessor;
pub use uppercase_accessor::{uppercase_table_ref, UppercaseAccessor};

mod prover_query;
#[cfg(feature = "hyperkzg")]
pub use prover_query::produce_hyperkzg_plan_trustlessly;
pub use prover_query::{
    produce_dory_plan_trustlessly, produce_plan_trustlessly, PlanProverQueryError, DEFAULT_SCHEMA,
};

mod verify;
pub use verify::{
    verify_from_zk_query_and_substrate_responses, verify_prover_via_gateway_response,
    VerifyProverResponseError,
};

/// tonic-generated code for interacting with the prover service
pub mod prover {
    tonic::include_proto!("sxt.core");
}

/// types for verifying attestations
pub mod attestation;
pub mod verifiable_commitment;
pub mod zk_query_models;
