use crate::base::{CommitmentEvaluationProofId, CommitmentScheme};
use ark_serialize::{CanonicalDeserialize, Compress, Validate};
use bumpalo::Bump;
use proof_of_sql::proof_primitive::dory::{DynamicDoryEvaluationProof, VerifierSetup};

// Default verifier setups for different commitment schemes.
const DYNAMIC_DORY_VERIFIER_SETUP_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/verifier_setups/dynamic-dory.bin"
));

impl CommitmentEvaluationProofId for DynamicDoryEvaluationProof {
    const COMMITMENT_SCHEME: CommitmentScheme = CommitmentScheme::DynamicDory;
    const DEFAULT_VERIFIER_SETUP_BYTES: &'static [u8] = DYNAMIC_DORY_VERIFIER_SETUP_BYTES;
    type DeserializationError = ark_serialize::SerializationError;

    fn deserialize_verifier_setup<'a>(
        bytes: &[u8],
        alloc: &'a Bump,
    ) -> Result<&'a VerifierSetup, Self::DeserializationError> {
        let setup = VerifierSetup::deserialize_with_mode(bytes, Compress::No, Validate::No)?;
        Ok(alloc.alloc(setup) as &'a VerifierSetup)
    }
}
