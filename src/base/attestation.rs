use super::{
    serde::hex::{deserialize_bytes_hex32, serialize_bytes_hex},
    verifiable_commitment::generate_commitment_leaf,
    zk_query_models::TableCommitmentWithProof,
    CommitmentScheme,
};
use crate::base::zk_query_models::AttestedCommitments;
use eth_merkle_tree::utils::{errors::BytesError, keccak::keccak256, verify::verify_proof};
use indexmap::IndexMap;
use itertools::{izip, process_results, Itertools};
use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha3::{digest::core_api::CoreWrapper, Digest, Keccak256, Keccak256Core};
use snafu::{ResultExt, Snafu};

/// Represents an Ethereum-style ECDSA signature, broken into its components.
///
/// Wrapper around the [`k256::ecdsa::Signature`] type.
#[derive(Clone, Debug, Copy, Eq, PartialEq, Serialize, Deserialize)]
pub struct EthereumSignature {
    /// The `r` component of the signature.
    #[serde(
        serialize_with = "serialize_bytes_hex",
        deserialize_with = "deserialize_bytes_hex32"
    )]
    pub r: [u8; 32],
    /// The `s` component of the signature.
    #[serde(
        serialize_with = "serialize_bytes_hex",
        deserialize_with = "deserialize_bytes_hex32"
    )]
    pub s: [u8; 32],
    /// The recovery ID, usually 27 or 28 for Ethereum.
    pub v: u8,
}

impl EthereumSignature {
    /// Creates a new `EthereumSignature`.
    ///
    /// If the recovery ID (`v`) is not provided, it defaults to `28`.
    pub fn new(r: [u8; 32], s: [u8; 32], v: Option<u8>) -> Self {
        Self {
            r,
            s,
            v: v.unwrap_or(28),
        }
    }
}

/// Top-level error type for the attestation module.
#[derive(Debug, Snafu)]
pub enum AttestationError {
    /// Error during verification.
    #[snafu(display("Verification error: {:?}", source))]
    VerificationError {
        /// Source of the error.
        source: AttestationVerificationError,
    },
    /// Error related to signing or verifying signatures.
    #[snafu(display("Signature error: {:?}", source))]
    SignatureError {
        /// Source of the error.
        source: SignatureError,
    },
    /// Error retrieving attestations
    #[snafu(display("Error retrieving attestations"))]
    MalformedData,
}

/// Specialized `Result` type for the attestation module.
type Result<T, E = AttestationError> = core::result::Result<T, E>;

/// Errors that can occur during verification.
#[derive(Debug, Snafu)]
pub enum AttestationVerificationError {
    /// The recovery ID does not match the Ethereum specification.
    #[snafu(display("Invalid recovery ID: {:?}", recovery_id))]
    InvalidRecoveryIdError {
        /// The recovery id that caused the error
        recovery_id: u8,
    },
    /// The public key could not be recovered.
    #[snafu(display("Key recovery error"))]
    KeyRecoveryError,
    /// The signature could not be recovered.
    #[snafu(display("Signature recovery error"))]
    SignatureRecoveryError,

    /// Invalid public key recovered
    #[snafu(display("The signature recovery resulted in an incorrect public key"))]
    InvalidPublicKeyRecovered,
    /// Error related to internals of Merkle tree-related computations.
    #[snafu(display("Bytes error: {:?}", err))]
    BytesError { err: BytesError },
    /// Failure to verify Merkle proof for commitments.
    #[snafu(display("Failed to verify Merkle proof"))]
    FailureToVerifyMerkleProof,
}

impl From<BytesError> for AttestationError {
    fn from(source: BytesError) -> Self {
        AttestationError::VerificationError {
            source: AttestationVerificationError::BytesError { err: source },
        }
    }
}

impl From<AttestationVerificationError> for AttestationError {
    fn from(source: AttestationVerificationError) -> Self {
        AttestationError::VerificationError { source }
    }
}

/// Errors related to signature generation and validation.
#[derive(Debug, Snafu)]
pub enum SignatureError {
    /// Error parsing the private key into the correct format.
    #[snafu(display("Error creating signing key from private key"))]
    CreateSigningKeyError,
}

/// Verifies an Ethereum ECDSA signature against a given message and public key.
///
/// This function performs the following steps:
/// 1. Parses the `EthereumSignature` into its `r`, `s`, and `v` components.
/// 2. Attempts to recover the public key from the message digest and signature.
/// 3. Compares the recovered public key with the provided public key to determine validity.
///
/// # Arguments
///
/// * `msg` - The message that was signed, represented as a slice of bytes.
/// * `scalars` - The Ethereum signature, containing the `r`, `s`, and `v` components.
/// * `pub_key` - The public key to verify the signature against, as a byte slice.
///
/// # Returns
///
/// Returns `Ok(())` if the signature is valid. Otherwise, returns an error describing the failure.
///
/// # Errors
///
/// * `VerificationError::SignatureRecoveryError` - If the signature could not be parsed.
/// * `VerificationError::InvalidRecoveryIdError` - If the recovery ID (`v`) is invalid.
/// * `VerificationError::KeyRecoveryError` - If the public key cannot be recovered.
/// * `VerificationError::PublicKeyParsingError` - If the provided public key is invalid.
/// * `VerificationError::InvalidPublicKeyRecovered` - If the recovered public key does not match the provided key.
///
/// # Examples
///
/// ```rust
/// let msg = b"Example message";
/// let signature = EthereumSignature { r: ..., s: ..., v: ... };
/// let pub_key = [0x04, ...]; // Compressed or uncompressed public key bytes.
///
/// match verify_eth_signature(msg, &signature, &pub_key) {
///     Ok(_) => println!("Signature is valid."),
///     Err(e) => println!("Signature verification failed: {:?}", e),
/// }
/// ```
pub fn verify_eth_signature(
    msg: &[u8],
    scalars: &EthereumSignature,
    address20: &[u8],
) -> Result<()> {
    let signature = Signature::from_scalars(scalars.r, scalars.s)
        .map_err(|_| AttestationVerificationError::SignatureRecoveryError)
        .context(VerificationSnafu)?;

    let recovery_id = RecoveryId::try_from(scalars.v)
        .map_err(|_| AttestationVerificationError::InvalidRecoveryIdError {
            recovery_id: scalars.v,
        })
        .context(VerificationSnafu)?;

    let digest = hash_eth_msg(msg);

    let recovered_pub_key = VerifyingKey::recover_from_digest(digest, &signature, recovery_id)
        .map_err(|_| AttestationVerificationError::KeyRecoveryError)
        .context(VerificationSnafu)?;

    let recovered_address = Keccak256::digest(
        recovered_pub_key
            .to_encoded_point(false)
            .as_bytes()
            .split_first()
            .ok_or(AttestationError::VerificationError {
                source: AttestationVerificationError::InvalidPublicKeyRecovered,
            })?
            .1,
    )
    .split_at_checked(12)
    .ok_or(AttestationError::VerificationError {
        source: AttestationVerificationError::InvalidPublicKeyRecovered,
    })?
    .1
    .to_vec();

    match address20 == recovered_address {
        true => Ok(()),
        false => Err(AttestationError::VerificationError {
            source: AttestationVerificationError::InvalidPublicKeyRecovered,
        }),
    }
}

/// Hashes a message with the Ethereum-specific prefix.
///
/// # Arguments
/// * `message` - The message to hash.
///
/// Returns the hashed message.
fn hash_eth_msg(message: &[u8]) -> CoreWrapper<Keccak256Core> {
    let prefix = format!("\x19Ethereum Signed Message:\n{}", message.len());
    let mut hasher = Keccak256::new();
    hasher.update(prefix.as_bytes());
    hasher.update(message);
    hasher
}

/// Creates an attestation message by concatenating the state root and block number.
///
/// # Arguments
/// * `state_root` - A reference to the state root, typically a cryptographic hash.
/// * `block_number` - The block number associated with this attestation.
///
/// # Returns
/// A `Vec<u8>` containing the serialized attestation message.
///
pub fn create_attestation_message<BN: Into<u64>>(
    state_root: impl AsRef<[u8]>,
    block_number: BN,
) -> Vec<u8> {
    let mut msg = Vec::with_capacity(state_root.as_ref().len() + core::mem::size_of::<u64>());
    msg.extend_from_slice(state_root.as_ref());
    msg.extend_from_slice(&block_number.into().to_be_bytes());
    msg
}

/// Represents attestations stored on-chain.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Attestation {
    /// The signature.
    signature: EthereumSignature,
    /// The ethereum address for this public key
    address20: Vec<u8>,
    /// The state root included in the attestation.
    state_root: Vec<u8>,
}

/// Now verify for each attestation and every commitment
pub fn verify_attestations(
    attested_commitments: &AttestedCommitments,
    commitment_scheme: CommitmentScheme,
) -> Result<IndexMap<String, TableCommitmentWithProof>, AttestationError> {
    let attestations = [
        attested_commitments.r.len(),
        attested_commitments.s.len(),
        attested_commitments.v.len(),
        attested_commitments.address20s.len(),
        attested_commitments.state_root.len(),
    ]
    .iter()
    .all_equal()
    .then(|| {
        izip!(
            attested_commitments.r.clone(),
            attested_commitments.s.clone(),
            attested_commitments.v.clone(),
            attested_commitments.address20s.clone(),
            attested_commitments.state_root.clone(),
        )
        .map(|(r, s, v, address20, state_root)| Attestation {
            signature: EthereumSignature { r, s, v },
            address20,
            state_root,
        })
        .collect::<Vec<_>>()
    })
    .ok_or(AttestationError::MalformedData)?;
    // Early filtering: extract table commitments attestations
    let table_commitments_attestations: Vec<_> = attestations
        .iter()
        .filter(|Attestation { state_root, .. }| {
            // Filter out state_roots with length != 33 or first byte != 0x00
            state_root.len() == 33 && state_root[0] == 0x00
        })
        .collect::<Vec<_>>();
    let block_number = attested_commitments.block_number;

    let is_valid = process_results(
        table_commitments_attestations
            .iter()
            .cartesian_product(attested_commitments.commitments.iter())
            .map(
                |(attestation, (table_id, commitment_with_proof))| -> Result<bool, AttestationError> {
                    // We need to verify
                    // 1. The signature on the attestation is valid
                    // 2. The [`TableCommitmentBytes`] is in fact a leaf in the attestation tree and that
                    //    the provided Merkle proof in [`TableCommitmentWithProof`] is valid for the leaf
                    //    with respect to the attestation's state root
                    let Attestation {
                        state_root,
                        signature,
                        address20,
                        ..
                    } = attestation;
                    let attestation_message = create_attestation_message(state_root, block_number);
                    verify_eth_signature(&attestation_message, signature, address20)?;
                    // Remove the first byte for it is the AttestationDomain
                    let actual_state_root = &state_root[1..];
                    let encoded_root = hex::encode(actual_state_root);
                    let keccak_encoded_leaf = keccak256(&hex::encode(generate_commitment_leaf(
                        table_id.to_string(),
                        commitment_scheme,
                        commitment_with_proof.commitment.clone(),
                    )))?;
                    Ok(verify_proof(
                        commitment_with_proof.merkle_proof.clone(),
                        &encoded_root,
                        &keccak_encoded_leaf,
                    )?)
                },
            ),
        |mut iter| iter.all(|ok| ok),
    )?;
    if !is_valid {
        return Err(AttestationError::VerificationError {
            source: AttestationVerificationError::FailureToVerifyMerkleProof,
        });
    }
    Ok(attested_commitments.commitments.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use indexmap::indexmap;
    use k256::ecdsa::SigningKey;
    use lazy_static::lazy_static;

    lazy_static! {
        static ref TABLE_COMMITMENTS_WITH_PROOF: IndexMap<String, TableCommitmentWithProof> = indexmap! {
        "ETHEREUM.BLOCKS".to_string() =>
            TableCommitmentWithProof {
                commitment: hex::decode("000000000000000000000000000d876b000000000000001001a3100e3a6539254118ca7fe91f313b12d56a08ad725f88b43bc89ad038d8141e4e759964be4bb3e87b8a94db952a96427bafa691b099f4d13771bdad5820be030be4d1262cae48e4760636a7416ad4c1ba6f03a23927911f0f6b2ac4afd76f010cb4ba9e13d6d82b61a34aa7f008da49dfba3929db348e3ae7c10014015a4d101d0ba7ec474ac37ad06e9f6145121681b9ada43b0b56f7714a42d43e9d67bf2579a37687bfa8c581f0a9a8a1f5fba516a75816ecbeead2fcd1c64f7a0198da1c9b8eb13d2d6e9cf0d88e045b99b24242530318ed2d95ca0f00365c26ae3bfb11c98f207570448277e9688c0387c46a2c233b3c9c93f171fd2051e4d22fe63c0548668d4f7a1e81c90383735b2e23df8358b28a42bc40b06ce8cbc84acd84960a52e6aab0caa08298b5db82a484aa60af67a8350f1f82d7858078adbedd465f2f535a19d22d122ad3215fa241f9a07c5ac251c93ce04a87f5e88ac8edb2634e0290141f303e73c814e149e8b66008cc053c20a5cd258a3c232675b866fdd61f2661498250b6f721ac41d09dcfcc0ac74537c3a04f801273a22453c3271171a40c3a351337d119b37131dc4a4f96da0e7e8c15f6454d59955ed6f4f9397cf3262199d9d7ffacd2f366023b6ffa2a9090b506edcf4ffbfa199dbc1a809d85ba1606d4ae5fb2d714ef695179bcb3964692a55c0075ad32b677f2edec81e3a7ea741d9317d9d93ebcce351862a3f36cc005db67d6da816c7c546f06bb7c5228fcd601dc82d4718d683ce6538cf99845739766509609d463df64e8ce7c9d10bca09505784aec8ce4405f01076c69466befb0b833c6a94236705bdbde649d65eb0d1f27dba5b9cb1740281d5316769ad16c21be7f7c4b611645fbce5e9b3af1a8dcb623817350bf716ba4ee44feb78604114b972c09ea8fcb91be5cf6ed3ca22ab2a316b3eebd35fb35ec8b27d85be78e4d5212ddf46d5e48d0e9f41bf1d4b252258601ca68eea8030b6259aa0b15ddd5b83565fc237ac6b02509672f1639671bee4621b950d60334824040dbdefc727b08c0d0631301ba958533513273a454d1f7d9039ecaba0997592f4674a36f27285a275f2518fffe97436198b4fe8ef1752714095138fc64cbcef906c4b7653dccd1365abda677009fab38787259262865a00d2e9f22d3355e5beb899e2017e0a55fef52755801e63742cf3eabbfae8b3c07060d0cf861bb8ff8c701d22335a20c16574ca74e2a077141b0247574f6fb44289f07371a5c031cda65b22855abb85e597695f857d260460a6fb2507a8a18b9bfbc2ef0e4cd091a0eb0b2eb3749651243ada88f944cc7599b0b4554368bc37e0497000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000a54494d455f5354414d5000000000090000000100000000000000070000000200000196a1640d780000019922887fb8000000000000000c424c4f434b5f4e554d4245520000000005000000050000000200000000015615c5000000000163aaa8000000000000000a424c4f434b5f48415348000000000b0000000000000000000000094741535f4c494d495400000000084b000000000000000000000000084741535f5553454400000000084b000000000000000000000000054d494e4552000000000b00000000000000000000000b504152454e545f48415348000000000b00000000000000000000000652455741524400000000084b0000000000000000000000000453495a45000000000500000005000000020000000000000499000000000017cdbe00000000000000115452414e53414354494f4e5f434f554e540000000004000000040000000200000000000007cb00000000000000054e4f4e4345000000000b00000000000000000000000d52454345495054535f524f4f54000000000b00000000000000000000000b534841335f554e434c4553000000000b00000000000000000000000a53544154455f524f4f54000000000b0000000000000000000000115452414e53414354494f4e535f524f4f54000000000b00000000000000000000000c554e434c45535f434f554e540000000005000000050000000200000000000000000000000000000000").unwrap(),
                merkle_proof: vec![
                    "0xf2afda566071d804a1fb62b99722702513773f4aa698fd2ddcf912ee67edb599".to_string(),
                    "0xa508cf57f9e22e629675fa8e2ef07708e3bed4d3308e4a6ec5166f00134146f6".to_string(),
                    "0x3da1bf86090d6c257805c8ef6be1b3bf96af7931b91c84af2c1eec23543f22e5".to_string(),
                    "0x10a732b82f460f2f5c44ad74e612bde0711ee049fb75079650b6022a8b015e0e".to_string(),
                    "0xe4e84d6e587c3773d668f8490d60e8eaac7ef539383c3a579f657264eb728926".to_string(),
                    "0x2b677d81aaa06a1b8157e57bdef2b558d8673521471c7110998a78d5044a2c0c".to_string(),
                    "0x175d8b52175b2a41100f99b443799d02debb8733dd30b02141abb4d2cbc413cd".to_string(),
                    "0xdb7deafdac53cd4028b5dbcc1e04e5b599028f6e71f078b58fbcf00347adcec3".to_string(),
                    "0x70cf225b30d5caccab230a8de5de1336d230fce32b5bb24754333dff62fe7dc6".to_string()
                ],
            },
        };
    }

    /// Converts a slice into a fixed-size array.
    ///
    /// Returns `None` if the slice is not of the expected length.
    fn slice_to_scalar(slice: &[u8]) -> Option<[u8; 32]> {
        slice.try_into().ok()
    }

    /// Signs a message with a private Ethereum key.
    ///
    /// # Arguments
    /// * `private_key` - The private key as a byte slice.
    /// * `message` - The message to sign.
    ///
    /// Returns the signature if successful.
    fn sign_eth_message(private_key: &[u8], message: &[u8]) -> Result<EthereumSignature> {
        let signing_key = SigningKey::from_bytes(private_key.into())
            .map_err(|_| SignatureError::CreateSigningKeyError)
            .context(SignatureSnafu)?;

        let digest = hash_eth_msg(message);

        // Gross coercion of types below
        let (signature, recovery_id) = signing_key.sign_digest_recoverable(digest).unwrap();
        let r = slice_to_scalar(&signature.r().to_bytes())
            .expect("r should work from sign_digest_recoverable");
        let s = slice_to_scalar(&signature.s().to_bytes())
            .expect("s should work from sign_digest_recoverable");

        Ok(EthereumSignature::new(r, s, Some(recovery_id.into())))
    }

    #[test]
    fn test_ethereum_signature_new_with_v() {
        let r = [1u8; 32];
        let s = [2u8; 32];
        let v = 27;

        let sig = EthereumSignature::new(r, s, Some(v));

        assert_eq!(sig.r, r);
        assert_eq!(sig.s, s);
        assert_eq!(sig.v, v);
    }

    #[test]
    fn test_ethereum_signature_new_without_v() {
        let r = [1u8; 32];
        let s = [2u8; 32];

        let sig = EthereumSignature::new(r, s, None);

        assert_eq!(sig.r, r);
        assert_eq!(sig.s, s);
        assert_eq!(sig.v, 28); // Default value
    }

    #[test]
    fn test_hash_eth_msg() {
        let message = b"test message";
        let hash = hash_eth_msg(message);
        let hash_bytes = hash.finalize();

        // The hash should include the Ethereum prefix
        let expected_prefix = format!("\x19Ethereum Signed Message:\n{}", message.len());
        let mut expected_hasher = Keccak256::new();
        expected_hasher.update(expected_prefix.as_bytes());
        expected_hasher.update(message);
        let expected_hash = expected_hasher.finalize();

        assert_eq!(hash_bytes.as_slice(), expected_hash.as_slice());
    }

    #[test]
    fn test_slice_to_scalar_valid() {
        let slice = [0u8; 32];
        let result = slice_to_scalar(&slice);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), slice);
    }

    #[test]
    fn test_slice_to_scalar_invalid_length() {
        let slice_short = [0u8; 31];
        let result = slice_to_scalar(&slice_short);
        assert!(result.is_none());

        let slice_long = [0u8; 33];
        let result = slice_to_scalar(&slice_long);
        assert!(result.is_none());
    }

    #[test]
    fn test_create_attestation_message() {
        let state_root = [0xaau8; 32];
        let block_number: u64 = 12345;

        let message = create_attestation_message(state_root, block_number);

        assert_eq!(message.len(), 40); // 32 bytes state_root + 8 bytes block_number
        assert_eq!(&message[..32], &state_root[..]);
        assert_eq!(&message[32..], &block_number.to_be_bytes()[..]);
    }

    #[test]
    fn test_create_attestation_message_different_types() {
        let state_root = vec![0xbbu8; 32];
        let block_number: u32 = 67890;

        let message = create_attestation_message(&state_root, block_number);

        assert_eq!(message.len(), 40);
        assert_eq!(&message[..32], &state_root[..]);
        assert_eq!(&message[32..], &(block_number as u64).to_be_bytes()[..]);
    }

    #[test]
    fn test_sign_eth_message_valid_key() {
        // Using a known test private key (DO NOT USE IN PRODUCTION)
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let message = b"test message";

        let result = sign_eth_message(&private_key, message);
        assert!(result.is_ok());

        let signature = result.unwrap();
        assert_eq!(signature.r.len(), 32);
        assert_eq!(signature.s.len(), 32);
        assert!(signature.v == 0 || signature.v == 1 || signature.v == 27 || signature.v == 28);
    }

    #[test]
    fn test_sign_eth_message_empty_message() {
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let message = b"";

        let result = sign_eth_message(&private_key, message);
        assert!(result.is_ok());
    }

    #[test]
    fn test_verify_eth_signature_valid() {
        // Generate a signature and verify it
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let message = b"test message for verification";

        // Sign the message
        let signature = sign_eth_message(&private_key, message).unwrap();

        // Get the public key from the private key
        let signing_key = SigningKey::from_bytes(&private_key.into()).unwrap();
        let verifying_key = signing_key.verifying_key();
        let address20 =
            Keccak256::digest(&verifying_key.to_encoded_point(false).as_bytes().to_vec()[1..])
                .to_vec()[12..]
                .to_vec();

        // Verify the signature
        let result = verify_eth_signature(message, &signature, &address20);
        assert!(result.is_ok());
    }

    #[test]
    fn test_verify_eth_signature_wrong_message() {
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let message = b"original message";
        let wrong_message = b"wrong message";

        // Sign the original message
        let signature = sign_eth_message(&private_key, message).unwrap();

        // Get the public key
        let signing_key = SigningKey::from_bytes(&private_key.into()).unwrap();
        let verifying_key = signing_key.verifying_key();
        let pub_key_bytes = verifying_key.to_encoded_point(false).as_bytes().to_vec();

        // Try to verify with wrong message
        let result = verify_eth_signature(wrong_message, &signature, &pub_key_bytes);
        assert!(matches!(
            result,
            Err(AttestationError::VerificationError {
                source: AttestationVerificationError::InvalidPublicKeyRecovered
            })
        ));
    }

    #[test]
    fn test_verify_eth_signature_wrong_public_key() {
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let wrong_private_key = [
            0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45,
            0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01,
            0x23, 0x45, 0x67, 0x89,
        ];
        let message = b"test message";

        // Sign with one key
        let signature = sign_eth_message(&private_key, message).unwrap();

        // Get public key from different private key
        let wrong_signing_key = SigningKey::from_bytes(&wrong_private_key.into()).unwrap();
        let wrong_verifying_key = wrong_signing_key.verifying_key();
        let wrong_pub_key_bytes = wrong_verifying_key
            .to_encoded_point(false)
            .as_bytes()
            .to_vec();

        // Try to verify with wrong public key
        let result = verify_eth_signature(message, &signature, &wrong_pub_key_bytes);
        assert!(matches!(
            result,
            Err(AttestationError::VerificationError {
                source: AttestationVerificationError::InvalidPublicKeyRecovered
            })
        ));
    }

    #[test]
    fn test_verify_eth_signature_invalid_signature() {
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let message = b"test message";

        // Create an invalid signature with all zeros
        let invalid_signature = EthereumSignature::new([0u8; 32], [0u8; 32], Some(27));

        // Get the public key
        let signing_key = SigningKey::from_bytes(&private_key.into()).unwrap();
        let verifying_key = signing_key.verifying_key();
        let pub_key_bytes = verifying_key.to_encoded_point(false).as_bytes().to_vec();

        // Try to verify invalid signature
        let result = verify_eth_signature(message, &invalid_signature, &pub_key_bytes);
        assert!(matches!(
            result,
            Err(AttestationError::VerificationError {
                source: AttestationVerificationError::SignatureRecoveryError
            })
        ));
    }

    #[test]
    fn test_verify_eth_signature_invalid_recovery_id() {
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let message = b"test message";

        // Sign the message
        let mut signature = sign_eth_message(&private_key, message).unwrap();
        // Set invalid recovery ID
        signature.v = 255;

        // Get the public key
        let signing_key = SigningKey::from_bytes(&private_key.into()).unwrap();
        let verifying_key = signing_key.verifying_key();
        let pub_key_bytes = verifying_key.to_encoded_point(false).as_bytes().to_vec();

        // Try to verify with invalid recovery ID
        let result = verify_eth_signature(message, &signature, &pub_key_bytes);
        assert!(matches!(
            result,
            Err(AttestationError::VerificationError {
                source: AttestationVerificationError::InvalidRecoveryIdError { recovery_id: 255 }
            })
        ));
    }

    #[test]
    fn test_sign_and_verify_roundtrip() {
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let messages: &[&[u8]] = &[
            b"short",
            b"a longer message with more content",
            b"",
            &[0u8; 1000],
        ];

        for message in messages.iter() {
            // Sign the message
            let signature = sign_eth_message(&private_key, message).unwrap();

            // Get the public key
            let signing_key = SigningKey::from_bytes(&private_key.into()).unwrap();
            let verifying_key = signing_key.verifying_key();
            let address20 =
                Keccak256::digest(&verifying_key.to_encoded_point(false).as_bytes().to_vec()[1..])
                    .to_vec()[12..]
                    .to_vec();

            // Verify the signature
            let result = verify_eth_signature(message, &signature, &address20);
            assert!(
                result.is_ok(),
                "Failed to verify signature for message length {}",
                message.len()
            );
        }
    }

    #[cfg(feature = "hyperkzg")]
    #[test]
    fn test_verify_attestations_with_hyper_kzg() {
        let attested_commitments = AttestedCommitments {
            commitments: TABLE_COMMITMENTS_WITH_PROOF.clone(),
            r: vec![
                hex::decode("0aadcc62871621389df55e32ab2a71bcbb60fbf75994ddccd26f3a4204726ae4")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("d8cc7dbf0881c1fedf2926433c8dc22b24de6030f1d503d133655e72ec970527")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("adefc9c8758708aca7cdc11f634f993c3e735d1cd23e6acc51df60aa46ecc8b8")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("0aadcc62871621389df55e32ab2a71bcbb60fbf75994ddccd26f3a4204726ae4")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("adefc9c8758708aca7cdc11f634f993c3e735d1cd23e6acc51df60aa46ecc8b8")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("d8cc7dbf0881c1fedf2926433c8dc22b24de6030f1d503d133655e72ec970527")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("840689485acafc5df1324d81d0667c40712c3c3a17fd6abba28ef50c3d4f3945")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("4db877e787216abef007c5fdc4332b44dfba84ef2b05146addba4320d372b24c")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("f2bcd53f539c1c08f3fb9cd226f225c9bb408f185bab5956163e31614412883b")
                    .unwrap()
                    .try_into()
                    .unwrap(),
            ],
            s: vec![
                hex::decode("15e73ea804162dcb455efcd747f40050e77cc9d585e7de9d640478ded029e920")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("06a66d51e3930b56c600d8112ff7f897b5e2292a7eeb120987d0fe26203f5bda")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("31504910641b0877511c8241fac881404a0b1e43e2a07cee03b5156e8151ac94")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("15e73ea804162dcb455efcd747f40050e77cc9d585e7de9d640478ded029e920")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("31504910641b0877511c8241fac881404a0b1e43e2a07cee03b5156e8151ac94")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("06a66d51e3930b56c600d8112ff7f897b5e2292a7eeb120987d0fe26203f5bda")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("14c3fe046eecd3ed14bc4d36bea8a70faa0eafb2ac8794e490166c1414a6c743")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("0cf12eadf29cd4fd8c897ab570303e007e7532234c89e04a49ab79b1b3eb85f8")
                    .unwrap()
                    .try_into()
                    .unwrap(),
                hex::decode("62f898bc36b410756ee5592a5cb4be06015f9b283d7d98b9bf65c288a7921d2b")
                    .unwrap()
                    .try_into()
                    .unwrap(),
            ],
            v: vec![1, 1, 1, 1, 1, 1, 1, 1, 0],
            state_root: vec![
                hex::decode("742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590")
                    .unwrap(),
                hex::decode("742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590")
                    .unwrap(),
                hex::decode("742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590")
                    .unwrap(),
                hex::decode("742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590")
                    .unwrap(),
                hex::decode("742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590")
                    .unwrap(),
                hex::decode("742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590")
                    .unwrap(),
                hex::decode("001c9eacb80783f8e6f9bd2645ec40d91dc294512bb4c53d68cb07f9e056d1904e")
                    .unwrap(),
                hex::decode("001c9eacb80783f8e6f9bd2645ec40d91dc294512bb4c53d68cb07f9e056d1904e")
                    .unwrap(),
                hex::decode("001c9eacb80783f8e6f9bd2645ec40d91dc294512bb4c53d68cb07f9e056d1904e")
                    .unwrap(),
            ],
            address20s: vec![
                hex::decode("e7c9f4d5b48920f6e561b4889bb9bef9874c57e0").unwrap(),
                hex::decode("813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace").unwrap(),
                hex::decode("8c2b9f40a674ca91f8ac5ff30eb17b80d768f209").unwrap(),
                hex::decode("e7c9f4d5b48920f6e561b4889bb9bef9874c57e0").unwrap(),
                hex::decode("8c2b9f40a674ca91f8ac5ff30eb17b80d768f209").unwrap(),
                hex::decode("813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace").unwrap(),
                hex::decode("813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace").unwrap(),
                hex::decode("8c2b9f40a674ca91f8ac5ff30eb17b80d768f209").unwrap(),
                hex::decode("e7c9f4d5b48920f6e561b4889bb9bef9874c57e0").unwrap(),
            ],
            block_number: 4539877,
            block_hash: hex::decode(
                "631a6cdd6a156d7e61fe7627ab04b7c748e4d61a29f13aee0b54d458fbcc87fe",
            )
            .unwrap()
            .try_into()
            .unwrap(),
        };

        let result = verify_attestations(&attested_commitments, CommitmentScheme::HyperKzg);
        assert!(result.is_ok(), "Verification failed: {:?}", result);
    }

    #[cfg(feature = "hyperkzg")]
    #[test]
    fn test_verify_attestations_work_if_all_attestations_have_filtered_out_state_roots() {
        let attested_commitments = AttestedCommitments {
            commitments: TABLE_COMMITMENTS_WITH_PROOF.clone(),
            r: vec![[0; 32], [0; 32]],
            s: vec![[1; 32], [1; 32]],
            v: vec![0, 0],
            state_root: vec![vec![0; 32], {
                let mut root = vec![0x01]; // Non-0x00 domain: will be filtered out
                root.extend_from_slice(&[0; 32]);
                root
            }],
            address20s: vec![vec![0; 20], vec![0; 20]],
            block_number: 1,
            block_hash: [0; 32],
        };

        // Since there are no table commitments attestations after filtering, and we have commitments
        // to verify, the verification should be verification success due to no table commitments
        // attestations existing
        let result = verify_attestations(&attested_commitments, CommitmentScheme::HyperKzg);

        assert!(result.is_ok());
    }
}
