#![doc = include_str!("README.md")]

pub(crate) mod serde;

mod commitment_scheme;
pub use commitment_scheme::{CommitmentEvaluationProofId, CommitmentScheme};

mod uppercase_accessor;
pub use uppercase_accessor::{uppercase_table_ref, UppercaseAccessor};

mod verify;
pub use verify::{
    verify_from_zk_query_and_substrate_responses, verify_prover_via_gateway_response,
    VerifyProverResponseError,
};

/// code for interacting with the prover service
pub mod prover;

/// types for verifying attestations
pub mod attestation;
pub mod verifiable_commitment;
pub mod zk_query_models;
