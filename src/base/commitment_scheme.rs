use super::prover;
#[cfg(feature = "native")]
use bumpalo::Bump;
#[cfg(all(feature = "hyperkzg", feature = "native"))]
use nova_snark::provider::hyperkzg::VerifierKey;
use proof_of_sql::base::commitment::CommitmentEvaluationProof;
#[cfg(all(feature = "hyperkzg", feature = "native"))]
use proof_of_sql::proof_primitive::hyperkzg::HyperKZGEngine;
use serde::{Deserialize, Serialize};

/// Commitment schemes used in the proof-of-sql SDK.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "native", derive(clap::ValueEnum))]
#[repr(u8)]
pub enum CommitmentScheme {
    /// Hyper KZG commitment scheme.
    #[cfg(feature = "hyperkzg")]
    HyperKzg = 0,
    /// Dynamic Dory commitment scheme.
    DynamicDory = 1,
}

impl core::fmt::Display for CommitmentScheme {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str(match self {
            CommitmentScheme::DynamicDory => "DynamicDory",
            #[cfg(feature = "hyperkzg")]
            CommitmentScheme::HyperKzg => "HyperKzg",
        })
    }
}

#[cfg(feature = "hyperkzg")]
const HYPER_KZG_VERIFIER_SETUP_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/verifier_setups/hyper-kzg.bin"
));

/// Convert a `CommitmentScheme` to a `prover::CommitmentScheme`.
impl From<CommitmentScheme> for prover::CommitmentScheme {
    fn from(scheme: CommitmentScheme) -> Self {
        match scheme {
            CommitmentScheme::DynamicDory => Self::DynamicDory,
            #[cfg(feature = "hyperkzg")]
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

    /// The default verifier setup for this commitment type in bytes.
    const DEFAULT_VERIFIER_SETUP_BYTES: &'static [u8];

    /// Error type for deserialization failures.
    type DeserializationError: core::error::Error;

    /// Deserialize the verifier public setup from bytes.
    #[cfg(feature = "native")]
    fn deserialize_verifier_setup<'a>(
        bytes: &[u8],
        alloc: &'a Bump,
    ) -> Result<
        <Self as CommitmentEvaluationProof>::VerifierPublicSetup<'a>,
        Self::DeserializationError,
    >;
}

#[cfg(feature = "hyperkzg")]
impl CommitmentEvaluationProofId
    for proof_of_sql::proof_primitive::hyperkzg::HyperKZGCommitmentEvaluationProof
{
    const COMMITMENT_SCHEME: CommitmentScheme = CommitmentScheme::HyperKzg;
    const DEFAULT_VERIFIER_SETUP_BYTES: &'static [u8] = HYPER_KZG_VERIFIER_SETUP_BYTES;
    type DeserializationError = bincode::error::DecodeError;

    #[cfg(feature = "native")]
    fn deserialize_verifier_setup<'a>(
        bytes: &[u8],
        alloc: &'a Bump,
    ) -> Result<&'a VerifierKey<HyperKZGEngine>, Self::DeserializationError> {
        let setup: VerifierKey<HyperKZGEngine> =
            proof_of_sql::base::try_standard_binary_deserialization(bytes)
                .map(|(setup, _)| setup)?;
        Ok(alloc.alloc(setup) as &'a VerifierKey<HyperKZGEngine>)
    }
}
