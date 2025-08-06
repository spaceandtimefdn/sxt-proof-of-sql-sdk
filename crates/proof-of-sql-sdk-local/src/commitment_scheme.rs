use crate::{
    prover, sxt_chain_runtime::api::runtime_types::proof_of_sql_commitment_map::commitment_scheme,
};
use ark_serialize::{CanonicalDeserialize, Compress, Validate};
use bumpalo::Bump;
use clap::ValueEnum;
use nova_snark::provider::hyperkzg::VerifierKey;
use proof_of_sql::{
    base::commitment::CommitmentEvaluationProof,
    proof_primitive::{
        dory::{DynamicDoryEvaluationProof, VerifierSetup},
        hyperkzg::{HyperKZGCommitmentEvaluationProof, HyperKZGEngine},
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

    /// Error type for deserialization failures.
    type DeserializationError: core::error::Error;

    /// Deserialize the verifier public setup from bytes.
    fn deserialize_verifier_setup<'a>(
        bytes: &[u8],
        alloc: &'a Bump,
    ) -> Result<
        <Self as CommitmentEvaluationProof>::VerifierPublicSetup<'a>,
        Self::DeserializationError,
    >;
}

impl CommitmentEvaluationProofId for HyperKZGCommitmentEvaluationProof {
    const COMMITMENT_SCHEME: CommitmentScheme = CommitmentScheme::HyperKzg;
    type DeserializationError = bincode::error::DecodeError;

    fn deserialize_verifier_setup<'a>(
        bytes: &[u8],
        alloc: &'a Bump,
    ) -> Result<&'a VerifierKey<HyperKZGEngine>, Self::DeserializationError> {
        let setup: VerifierKey<HyperKZGEngine> = bincode::serde::decode_from_slice(
            bytes,
            bincode::config::legacy()
                .with_fixed_int_encoding()
                .with_big_endian(),
        )
        .map(|(setup, _)| setup)?;
        Ok(alloc.alloc(setup) as &'a VerifierKey<HyperKZGEngine>)
    }
}

impl CommitmentEvaluationProofId for DynamicDoryEvaluationProof {
    const COMMITMENT_SCHEME: CommitmentScheme = CommitmentScheme::DynamicDory;
    type DeserializationError = ark_serialize::SerializationError;

    fn deserialize_verifier_setup<'a>(
        bytes: &[u8],
        alloc: &'a Bump,
    ) -> Result<&'a VerifierSetup, Self::DeserializationError> {
        let setup = VerifierSetup::deserialize_with_mode(bytes, Compress::No, Validate::No)?;
        Ok(alloc.alloc(setup) as &'a VerifierSetup)
    }
}
