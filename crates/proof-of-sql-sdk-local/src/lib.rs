#![doc = include_str!("../README.md")]

/// subxt-generated code for interacting with the sxt-chain runtime
pub mod sxt_chain_runtime;

mod substrate_query;
pub use substrate_query::table_ref_to_table_id;

mod prover_query;
pub use prover_query::{plan_prover_query_dory, PlanProverQueryError, DEFAULT_SCHEMA};

mod verify;
pub use verify::{verify_prover_response, VerifyProverResponseError};

/// tonic-generated code for interacting with the prover service
pub mod prover {
    tonic::include_proto!("sxt.core");
}

/// types for verifying attestations
pub mod attestation;
