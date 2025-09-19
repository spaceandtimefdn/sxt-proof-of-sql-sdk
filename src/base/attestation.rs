use super::{
    serde::hex::{deserialize_bytes_hex, deserialize_bytes_hex32, serialize_bytes_hex},
    sxt_chain_runtime as runtime,
    verifiable_commitment::generate_commitment_leaf,
    zk_query_models::TableCommitmentWithProof,
    CommitmentScheme,
};
use eth_merkle_tree::utils::{errors::BytesError, keccak::keccak256, verify::verify_proof};
use indexmap::IndexMap;
use itertools::{process_results, Itertools};
use k256::ecdsa::{RecoveryId, Signature, SigningKey, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha3::{digest::core_api::CoreWrapper, Digest, Keccak256, Keccak256Core};
use snafu::{ResultExt, Snafu};
use subxt::utils::H256;

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
    /// Error parsing the public key.
    #[snafu(display("Public key parsing error"))]
    PublicKeyError,
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
    /// The public key could not be parsed.
    #[snafu(display("Public key parsing error"))]
    PublicKeyParsingError,
    /// The signature could not be recovered.
    #[snafu(display("Signature recovery error"))]
    SignatureRecoveryError,

    /// Invalid public key recovered
    #[snafu(display("The signature recovery resulted in an incorrect public key"))]
    InvalidPublicKeyRecovered,
    /// Error related to internals of Merkle tree-related computations.
    #[snafu(display("Bytes error: {:?}", source))]
    BytesError { source: BytesError },
    /// Failure to verify Merkle proof for commitments.
    #[snafu(display("Failed to verify Merkle proof"))]
    FailureToVerifyMerkleProof,
}

impl From<BytesError> for AttestationError {
    fn from(source: BytesError) -> Self {
        AttestationError::VerificationError {
            source: AttestationVerificationError::BytesError { source },
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
pub fn verify_eth_signature(msg: &[u8], scalars: &EthereumSignature, pub_key: &[u8]) -> Result<()> {
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

    let expected_key = VerifyingKey::from_sec1_bytes(pub_key)
        .map_err(|_| AttestationVerificationError::PublicKeyParsingError)
        .context(VerificationSnafu)?;

    match recovered_pub_key == expected_key {
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

/// Signs a message with a private Ethereum key.
///
/// # Arguments
/// * `private_key` - The private key as a byte slice.
/// * `message` - The message to sign.
///
/// Returns the signature if successful.
pub fn sign_eth_message(private_key: &[u8], message: &[u8]) -> Result<EthereumSignature> {
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

/// Converts a slice into a fixed-size array.
///
/// Returns `None` if the slice is not of the expected length.
fn slice_to_scalar(slice: &[u8]) -> Option<[u8; 32]> {
    slice.try_into().ok()
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

/// Verifies the signature of an attestation.
///
/// This function checks whether an Ethereum-style signature is valid for the provided message
/// and public key. It is typically used to validate attestations in a blockchain context.
///
/// # Arguments
///
/// * `msg` - The message that was signed, as a byte slice.
/// * `signature` - The Ethereum signature to verify, containing `r`, `s`, and `v` components.
/// * `proposed_pub_key` - The public key proposed for validation, as a 33-byte array.
/// * `block_number` - The block number associated with the attestation, used for error context.
///
/// # Returns
///
/// Returns `Ok(())` if the signature is valid. Otherwise, returns an error indicating why the
/// validation failed.
///
/// # Errors
///
/// * `AttestationError::InvalidSignature` - If the signature validation fails.
/// * `AttestationError::VerificationError` - If a lower-level signature verification error occurs.
///
/// # Examples
///
/// ```rust
/// let msg = b"Example attestation message";
/// let signature = EthereumSignature { r: ..., s: ..., v: ... };
/// let proposed_pub_key = [0x02, ...]; // Compressed public key bytes.
/// let block_number = 42;
///
/// match verify_signature(msg, &signature, &proposed_pub_key, block_number) {
///     Ok(_) => println!("Attestation signature is valid."),
///     Err(e) => println!("Attestation signature verification failed: {:?}", e),
/// }
/// ```
pub fn verify_signature(
    msg: &[u8],
    signature: &runtime::api::runtime_types::sxt_core::attestation::EthereumSignature,
    proposed_pub_key: &[u8; 33],
) -> Result<(), AttestationError> {
    let runtime::api::runtime_types::sxt_core::attestation::EthereumSignature { r, s, v } =
        signature;
    let signature = EthereumSignature {
        r: *r,
        s: *s,
        v: *v,
    };

    verify_eth_signature(msg, &signature, proposed_pub_key)?;

    Ok(())
}

/// Represents attestations stored on-chain.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Attestation {
    /// An Ethereum-style attestation.
    #[serde(rename_all = "camelCase")]
    EthereumAttestation {
        /// The signature.
        signature: EthereumSignature,
        /// The public key used to sign the attestation.
        #[serde(
            serialize_with = "serialize_bytes_hex",
            deserialize_with = "deserialize_bytes_hex"
        )]
        proposed_pub_key: Vec<u8>,
        /// The ethereum address for this public key
        #[serde(
            serialize_with = "serialize_bytes_hex",
            deserialize_with = "deserialize_bytes_hex"
        )]
        address20: Vec<u8>,
        /// The state root included in the attestation.
        #[serde(
            serialize_with = "serialize_bytes_hex",
            deserialize_with = "deserialize_bytes_hex"
        )]
        state_root: Vec<u8>,
        /// The block number that was attested
        block_number: u64,
        /// The hash of the block that was attested
        block_hash: H256,
    },
}

impl Attestation {
    /// Get the [`EthereumSignature`] if this variant has one.
    pub fn signature(&self) -> Option<&EthereumSignature> {
        match self {
            Attestation::EthereumAttestation { signature, .. } => Some(signature),
            // more variants later → return None by default
        }
    }

    /// Get the proposed public key if this variant has one.
    pub fn proposed_pub_key(&self) -> Option<&[u8]> {
        match self {
            Attestation::EthereumAttestation {
                proposed_pub_key, ..
            } => Some(proposed_pub_key),
            // more variants later → return None by default
        }
    }

    /// Get the state_root if this variant has one.
    pub fn state_root(&self) -> Option<Vec<u8>> {
        match self {
            Attestation::EthereumAttestation { state_root, .. } => Some(state_root.clone()),
            // more variants later → return None by default
        }
    }

    /// Get the block number if this variant has one.
    pub fn block_number(&self) -> Option<u64> {
        match self {
            Attestation::EthereumAttestation { block_number, .. } => Some(*block_number),
            // more variants later → return None by default
        }
    }
}

/// Response containing attestation info used by the attestation RPCs.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttestationsResponse {
    /// The attestations for the `attestations_for` block.
    pub attestations: Vec<Attestation>,
    /// The block hash that was attested.
    pub attestations_for: H256,
    /// The block number that was attested.
    pub attestations_for_block_number: u32,
    /// The block that was used to query storage.
    pub at: H256,
}

/// Now verify for each attestation and every commitment
pub fn verify_attestations(
    attestations: &[Attestation],
    table_commitment_with_proof: &IndexMap<String, TableCommitmentWithProof>,
    commitment_scheme: CommitmentScheme,
) -> Result<(), AttestationError> {
    // Early filtering: extract table commitments attestations
    let table_commitments_attestations: Vec<_> = attestations
        .iter()
        .filter(|attestation| {
            let Attestation::EthereumAttestation { state_root, .. } = attestation;

            // Filter out state_roots with length != 33 or first byte != 0x00
            state_root.len() == 33 && state_root[0] == 0x00
        })
        .collect::<Vec<_>>();

    let is_valid = process_results(
        table_commitments_attestations
            .iter()
            .cartesian_product(table_commitment_with_proof.into_iter())
            .map(
                |(attestation, (table_id, commitment_with_proof))| -> Result<bool, AttestationError> {
                    // We need to verify
                    // 1. The signature on the attestation is valid
                    // 2. The [`TableCommitmentBytes`] is in fact a leaf in the attestation tree and that
                    //    the provided Merkle proof in [`TableCommitmentWithProof`] is valid for the leaf
                    //    with respect to the attestation's state root
                    let Attestation::EthereumAttestation {
                        state_root,
                        block_number,
                        signature,
                        proposed_pub_key,
                        ..
                    } = attestation;
                    let attestation_message = create_attestation_message(state_root, *block_number);
                    verify_eth_signature(&attestation_message, signature, proposed_pub_key)?;
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
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use indexmap::indexmap;
    use lazy_static::lazy_static;
    use serde_json;

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
        let pub_key_bytes = verifying_key.to_encoded_point(false).as_bytes().to_vec();

        // Verify the signature
        let result = verify_eth_signature(message, &signature, &pub_key_bytes);
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
    fn test_verify_eth_signature_invalid_public_key_format() {
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let message = b"test message";

        // Sign the message
        let signature = sign_eth_message(&private_key, message).unwrap();

        // Invalid public key (wrong length)
        let invalid_pub_key = vec![0u8; 10];

        // Try to verify with invalid public key format
        let result = verify_eth_signature(message, &signature, &invalid_pub_key);
        assert!(matches!(
            result,
            Err(AttestationError::VerificationError {
                source: AttestationVerificationError::PublicKeyParsingError
            })
        ));
    }

    #[test]
    fn test_verify_signature_wrapper() {
        let private_key = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
            0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
            0x89, 0xab, 0xcd, 0xef,
        ];
        let message = b"test message";

        // Sign the message
        let eth_signature = sign_eth_message(&private_key, message).unwrap();

        // Convert to runtime signature type
        let runtime_sig = runtime::api::runtime_types::sxt_core::attestation::EthereumSignature {
            r: eth_signature.r,
            s: eth_signature.s,
            v: eth_signature.v,
        };

        // Get the public key (compressed format)
        let signing_key = SigningKey::from_bytes(&private_key.into()).unwrap();
        let verifying_key = signing_key.verifying_key();
        let pub_key_compressed = verifying_key.to_encoded_point(true).as_bytes().to_vec();
        let mut pub_key_array = [0u8; 33];
        pub_key_array.copy_from_slice(&pub_key_compressed);

        // Verify the signature
        let result = verify_signature(message, &runtime_sig, &pub_key_array);
        assert!(result.is_ok());
    }

    #[test]
    fn test_attestation_serialization() {
        let attestation = Attestation::EthereumAttestation {
            signature: EthereumSignature::new([1u8; 32], [2u8; 32], Some(27)),
            proposed_pub_key: vec![3u8; 33],
            address20: vec![4u8; 20],
            state_root: vec![5u8; 32],
            block_number: 12345,
            block_hash: H256::from([6u8; 32]),
        };

        // Serialize to JSON
        let json = serde_json::to_string(&attestation).unwrap();

        // Deserialize back
        let deserialized: Attestation = serde_json::from_str(&json).unwrap();

        assert_eq!(attestation, deserialized);
    }

    #[test]
    fn test_attestation_response_serialization() {
        let response = AttestationsResponse {
            attestations: vec![Attestation::EthereumAttestation {
                signature: EthereumSignature::new([1u8; 32], [2u8; 32], Some(27)),
                proposed_pub_key: vec![3u8; 33],
                address20: vec![4u8; 20],
                state_root: vec![5u8; 32],
                block_number: 12345,
                block_hash: H256::from([6u8; 32]),
            }],
            attestations_for: H256::from([7u8; 32]),
            attestations_for_block_number: 67890,
            at: H256::from([8u8; 32]),
        };

        // Serialize to JSON
        let json = serde_json::to_string(&response).unwrap();

        // Deserialize back
        let deserialized: AttestationsResponse = serde_json::from_str(&json).unwrap();

        assert_eq!(response, deserialized);
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
            let pub_key_bytes = verifying_key.to_encoded_point(false).as_bytes().to_vec();

            // Verify the signature
            let result = verify_eth_signature(message, &signature, &pub_key_bytes);
            assert!(
                result.is_ok(),
                "Failed to verify signature for message length {}",
                message.len()
            );
        }
    }

    #[test]
    fn test_attestations_response_deserialization() {
        let json_data = r#"{
            "attestations": [
                {
                    "signature": {
                        "r": "0x3237b93564178a49a6fa9cc96f0a3df5e27fa53a28cf1a88ac64a17f73d2944a",
                        "s": "0x09a97f7a405ef418c98dd663fb5fd56f1c0862d1193a3d028c18d368d166347e",
                        "v": 1
                    },
                    "proposedPubKey": "0x0259fa36fd0d3fc21ba33904a68d6af18edf59bf5a9c1cc31dda371d3f38993bc9",
                    "address20": "0x813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace",
                    "stateRoot": "0xd59fb8badcfe01e423f5bac34ef53ab541c6c644f34ba5ad822d2d9bb12a34ec",
                    "blockNumber": 3871761,
                    "blockHash": "0x714ba2ae2caa5c669e4a348f9000b6225b6803bee989b8caca009f790a1b1ad8"
                },
                {
                    "signature": {
                        "r": "0x96a8b2f3b0012e1b07d7fa45ef262089897820e9169c39ee6615369ca7c97a59",
                        "s": "0x0de1c99c2237d53009081595c6e44377b10d04c426a2e3c61719aeaab9552010",
                        "v": 0
                    },
                    "proposedPubKey": "0x03b1f15d1e2a19d0784547de80b271f28cc7aaed0030d8409f9462a94f920062f2",
                    "address20": "0x8c2b9f40a674ca91f8ac5ff30eb17b80d768f209",
                    "stateRoot": "0xd59fb8badcfe01e423f5bac34ef53ab541c6c644f34ba5ad822d2d9bb12a34ec",
                    "blockNumber": 3871761,
                    "blockHash": "0x714ba2ae2caa5c669e4a348f9000b6225b6803bee989b8caca009f790a1b1ad8"
                },
                {
                    "signature": {
                        "r": "0xcf557caac3a7468fbff30bdbcbce6c6f74d047b4f7ca58ba3db013e3c6e28952",
                        "s": "0x32fb4912195e408ee5e662b1cf93fc9426d157dbcd82963028872fef2d1f8989",
                        "v": 1
                    },
                    "proposedPubKey": "0x02e6b88162d12753a7f9074ca32854bb9022941f2158f3f179212d1abb030125b3",
                    "address20": "0xe7c9f4d5b48920f6e561b4889bb9bef9874c57e0",
                    "stateRoot": "0xd59fb8badcfe01e423f5bac34ef53ab541c6c644f34ba5ad822d2d9bb12a34ec",
                    "blockNumber": 3871761,
                    "blockHash": "0x714ba2ae2caa5c669e4a348f9000b6225b6803bee989b8caca009f790a1b1ad8"
                }
            ],
            "attestationsFor": "0x714ba2ae2caa5c669e4a348f9000b6225b6803bee989b8caca009f790a1b1ad8",
            "attestationsForBlockNumber": 3871761,
            "at": "0xd269eca553be9eb838bd6d8de6bcfab88ec0491de2eb05c2d6f9606696c9f6bc"
        }"#;

        let response: AttestationsResponse = serde_json::from_str(json_data).unwrap();
        assert_eq!(response.attestations.len(), 3);
        assert_eq!(response.attestations_for_block_number, 3871761);
    }

    #[test]
    fn test_single_attestation_deserialization() {
        let json_data = r#"{
            "signature": {
                "r": "0x3237b93564178a49a6fa9cc96f0a3df5e27fa53a28cf1a88ac64a17f73d2944a",
                "s": "0x09a97f7a405ef418c98dd663fb5fd56f1c0862d1193a3d028c18d368d166347e",
                "v": 1
            },
            "proposedPubKey": "0x0259fa36fd0d3fc21ba33904a68d6af18edf59bf5a9c1cc31dda371d3f38993bc9",
            "address20": "0x813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace",
            "stateRoot": "0xd59fb8badcfe01e423f5bac34ef53ab541c6c644f34ba5ad822d2d9bb12a34ec",
            "blockNumber": 3871761,
            "blockHash": "0x714ba2ae2caa5c669e4a348f9000b6225b6803bee989b8caca009f790a1b1ad8"
        }"#;

        let attestation: Attestation = serde_json::from_str(json_data).unwrap();
        assert_eq!(attestation.block_number().unwrap(), 3871761);
        assert_eq!(attestation.signature().unwrap().v, 1);
    }

    #[test]
    fn test_verify_attestations_with_hyper_kzg() {
        let attestations = vec![
            // Attestation 1 - block 4425701, blockHash 0x697cf...35fef (filtered out - 32 byte state_root)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "0aadcc62871621389df55e32ab2a71bcbb60fbf75994ddccd26f3a4204726ae4",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "15e73ea804162dcb455efcd747f40050e77cc9d585e7de9d640478ded029e920",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "02e6b88162d12753a7f9074ca32854bb9022941f2158f3f179212d1abb030125b3",
                )
                .unwrap(),
                address20: hex::decode("e7c9f4d5b48920f6e561b4889bb9bef9874c57e0").unwrap(),
                state_root: hex::decode(
                    "742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590",
                )
                .unwrap(),
                block_number: 4425701,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "697cf0edc651905f40df340b9bb4273bf829aab988b36df175e1ea6e3bd35fef",
                    )
                    .unwrap(),
                ),
            },
            // Attestation 2 - block 4425701, blockHash 0x697cf...35fef (filtered out - 32 byte state_root)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "d8cc7dbf0881c1fedf2926433c8dc22b24de6030f1d503d133655e72ec970527",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "06a66d51e3930b56c600d8112ff7f897b5e2292a7eeb120987d0fe26203f5bda",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "0259fa36fd0d3fc21ba33904a68d6af18edf59bf5a9c1cc31dda371d3f38993bc9",
                )
                .unwrap(),
                address20: hex::decode("813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace").unwrap(),
                state_root: hex::decode(
                    "742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590",
                )
                .unwrap(),
                block_number: 4425701,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "697cf0edc651905f40df340b9bb4273bf829aab988b36df175e1ea6e3bd35fef",
                    )
                    .unwrap(),
                ),
            },
            // Attestation 3 - block 4425701, blockHash 0x697cf...35fef (filtered out - 32 byte state_root)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "adefc9c8758708aca7cdc11f634f993c3e735d1cd23e6acc51df60aa46ecc8b8",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "31504910641b0877511c8241fac881404a0b1e43e2a07cee03b5156e8151ac94",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "03b1f15d1e2a19d0784547de80b271f28cc7aaed0030d8409f9462a94f920062f2",
                )
                .unwrap(),
                address20: hex::decode("8c2b9f40a674ca91f8ac5ff30eb17b80d768f209").unwrap(),
                state_root: hex::decode(
                    "742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590",
                )
                .unwrap(),
                block_number: 4425701,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "697cf0edc651905f40df340b9bb4273bf829aab988b36df175e1ea6e3bd35fef",
                    )
                    .unwrap(),
                ),
            },
            // Attestation 4 - block 4425701, blockHash 0xc6a40...0dba7 (filtered out - 32 byte state_root)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "0aadcc62871621389df55e32ab2a71bcbb60fbf75994ddccd26f3a4204726ae4",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "15e73ea804162dcb455efcd747f40050e77cc9d585e7de9d640478ded029e920",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "02e6b88162d12753a7f9074ca32854bb9022941f2158f3f179212d1abb030125b3",
                )
                .unwrap(),
                address20: hex::decode("e7c9f4d5b48920f6e561b4889bb9bef9874c57e0").unwrap(),
                state_root: hex::decode(
                    "742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590",
                )
                .unwrap(),
                block_number: 4425701,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "c6a40099a6cbf095764597d78c49f6ab2dfd8d3fabda3ce3f064cd6d5840dba7",
                    )
                    .unwrap(),
                ),
            },
            // Attestation 5 - block 4425701, blockHash 0xc6a40...0dba7 (filtered out - 32 byte state_root)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "adefc9c8758708aca7cdc11f634f993c3e735d1cd23e6acc51df60aa46ecc8b8",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "31504910641b0877511c8241fac881404a0b1e43e2a07cee03b5156e8151ac94",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "03b1f15d1e2a19d0784547de80b271f28cc7aaed0030d8409f9462a94f920062f2",
                )
                .unwrap(),
                address20: hex::decode("8c2b9f40a674ca91f8ac5ff30eb17b80d768f209").unwrap(),
                state_root: hex::decode(
                    "742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590",
                )
                .unwrap(),
                block_number: 4425701,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "c6a40099a6cbf095764597d78c49f6ab2dfd8d3fabda3ce3f064cd6d5840dba7",
                    )
                    .unwrap(),
                ),
            },
            // Attestation 6 - block 4425701, blockHash 0xc6a40...0dba7 (filtered out - 32 byte state_root)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "d8cc7dbf0881c1fedf2926433c8dc22b24de6030f1d503d133655e72ec970527",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "06a66d51e3930b56c600d8112ff7f897b5e2292a7eeb120987d0fe26203f5bda",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "0259fa36fd0d3fc21ba33904a68d6af18edf59bf5a9c1cc31dda371d3f38993bc9",
                )
                .unwrap(),
                address20: hex::decode("813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace").unwrap(),
                state_root: hex::decode(
                    "742fdac4036e107068940342dbc4b638388736107aa28f4c91e49b9435c89590",
                )
                .unwrap(),
                block_number: 4425701,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "c6a40099a6cbf095764597d78c49f6ab2dfd8d3fabda3ce3f064cd6d5840dba7",
                    )
                    .unwrap(),
                ),
            },
            // Attestation 7 - block 4539877, blockHash 0x631a6...c87fe (valid - 33 byte state_root with 0x00 prefix)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "840689485acafc5df1324d81d0667c40712c3c3a17fd6abba28ef50c3d4f3945",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "14c3fe046eecd3ed14bc4d36bea8a70faa0eafb2ac8794e490166c1414a6c743",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "0259fa36fd0d3fc21ba33904a68d6af18edf59bf5a9c1cc31dda371d3f38993bc9",
                )
                .unwrap(),
                address20: hex::decode("813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace").unwrap(),
                state_root: hex::decode(
                    "001c9eacb80783f8e6f9bd2645ec40d91dc294512bb4c53d68cb07f9e056d1904e",
                )
                .unwrap(),
                block_number: 4539877,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "631a6cdd6a156d7e61fe7627ab04b7c748e4d61a29f13aee0b54d458fbcc87fe",
                    )
                    .unwrap(),
                ),
            },
            // Attestation 8 - block 4539877, blockHash 0x631a6...c87fe (valid - 33 byte state_root with 0x00 prefix)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "4db877e787216abef007c5fdc4332b44dfba84ef2b05146addba4320d372b24c",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "0cf12eadf29cd4fd8c897ab570303e007e7532234c89e04a49ab79b1b3eb85f8",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "03b1f15d1e2a19d0784547de80b271f28cc7aaed0030d8409f9462a94f920062f2",
                )
                .unwrap(),
                address20: hex::decode("8c2b9f40a674ca91f8ac5ff30eb17b80d768f209").unwrap(),
                state_root: hex::decode(
                    "001c9eacb80783f8e6f9bd2645ec40d91dc294512bb4c53d68cb07f9e056d1904e",
                )
                .unwrap(),
                block_number: 4539877,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "631a6cdd6a156d7e61fe7627ab04b7c748e4d61a29f13aee0b54d458fbcc87fe",
                    )
                    .unwrap(),
                ),
            },
            // Attestation 9 - block 4539877, blockHash 0x631a6...c87fe (valid - 33 byte state_root with 0x00 prefix)
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: hex::decode(
                        "f2bcd53f539c1c08f3fb9cd226f225c9bb408f185bab5956163e31614412883b",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    s: hex::decode(
                        "62f898bc36b410756ee5592a5cb4be06015f9b283d7d98b9bf65c288a7921d2b",
                    )
                    .unwrap()
                    .try_into()
                    .unwrap(),
                    v: 0,
                },
                proposed_pub_key: hex::decode(
                    "02e6b88162d12753a7f9074ca32854bb9022941f2158f3f179212d1abb030125b3",
                )
                .unwrap(),
                address20: hex::decode("e7c9f4d5b48920f6e561b4889bb9bef9874c57e0").unwrap(),
                state_root: hex::decode(
                    "001c9eacb80783f8e6f9bd2645ec40d91dc294512bb4c53d68cb07f9e056d1904e",
                )
                .unwrap(),
                block_number: 4539877,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "631a6cdd6a156d7e61fe7627ab04b7c748e4d61a29f13aee0b54d458fbcc87fe",
                    )
                    .unwrap(),
                ),
            },
        ];

        let result = verify_attestations(
            &attestations,
            &TABLE_COMMITMENTS_WITH_PROOF,
            CommitmentScheme::HyperKzg,
        );
        assert!(result.is_ok(), "Verification failed: {:?}", result);
    }

    #[test]
    fn test_verify_attestations_work_if_all_attestations_have_filtered_out_state_roots() {
        // Attestations with state_root length != 33 are filtered out (valid but not used)
        let attestations = vec![
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: [0; 32],
                    s: [1; 32],
                    v: 0,
                },
                proposed_pub_key: vec![0; 33],
                address20: vec![0; 20],
                state_root: vec![0; 32], // Length != 33: will be filtered out
                block_number: 1,
                block_hash: H256::zero(),
            },
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: [0; 32],
                    s: [1; 32],
                    v: 0,
                },
                proposed_pub_key: vec![0; 33],
                address20: vec![0; 20],
                state_root: {
                    let mut root = vec![0x01]; // Non-0x00 domain: will be filtered out
                    root.extend_from_slice(&[0; 32]);
                    root
                },
                block_number: 1,
                block_hash: H256::zero(),
            },
        ];

        // Since there are no table commitments attestations after filtering, and we have commitments
        // to verify, the verification should be verification success due to no table commitments
        // attestations existing
        let result = verify_attestations(
            &attestations,
            &TABLE_COMMITMENTS_WITH_PROOF,
            CommitmentScheme::HyperKzg,
        );

        assert!(result.is_ok());
    }
}
