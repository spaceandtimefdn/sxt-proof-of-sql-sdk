use super::sxt_chain_runtime as runtime;
use k256::ecdsa::{RecoveryId, Signature, SigningKey, VerifyingKey};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use sha3::{digest::core_api::CoreWrapper, Digest, Keccak256, Keccak256Core};
use snafu::{ResultExt, Snafu};
use sp_core::Bytes;
use subxt::utils::H256;

/// Hex serialization function.
///
/// Can be used in `#[serde(serialize_with = "")]` attributes for any `AsRef<[u8]>` type.
fn serialize_bytes_hex<S>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    Bytes(bytes.to_vec()).serialize(serializer)
}

/// Hex deserialization function.
///
/// Can be used in `#[serde(deserialize_with = "deserialize_bytes_hex")]`
/// for any `Vec<u8>` type.
fn deserialize_bytes_hex<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
where
    D: Deserializer<'de>,
{
    let b = Bytes::deserialize(deserializer)?;
    Ok(b.0)
}

/// Represents an Ethereum-style ECDSA signature, broken into its components.
///
/// Wrapper around the [`k256::ecdsa::Signature`] type.
#[derive(Clone, Debug, Copy, Eq, PartialEq, Serialize, Deserialize)]
pub struct EthereumSignature {
    /// The `r` component of the signature.
    pub r: [u8; 32],
    /// The `s` component of the signature.
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
