use super::{
    serde::hex::{deserialize_bytes_hex, deserialize_bytes_hex32, serialize_bytes_hex},
    sxt_chain_runtime as runtime,
    verifiable_commitment::{generate_commitment_leaf, VerifiableCommitment},
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
    verified_commitments: &IndexMap<String, VerifiableCommitment>,
    commitment_scheme: CommitmentScheme,
) -> Result<(), AttestationError> {
    let is_valid = process_results(
        attestations
            .iter()
            .cartesian_product(verified_commitments.clone().into_iter())
            .map(
                |(attestation, (table_id, verified_commitment))| -> Result<bool, AttestationError> {
                    // We need to verify
                    // 1. The signature on the attestation is valid
                    // 2. The [`TableCommitmentBytes`] is in fact a leaf in the attestation tree and that
                    //    the provided Merkle proof in [`VerifiableCommitment`] is valid for the leaf
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
                    let encoded_root = hex::encode(state_root);
                    let keccak_encoded_leaf = keccak256(&hex::encode(generate_commitment_leaf(
                        table_id,
                        commitment_scheme,
                        verified_commitment.commitment.0,
                    )))?;
                    Ok(verify_proof(
                        verified_commitment.merkle_proof.clone(),
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
    use sp_core::Bytes;

    lazy_static! {
        static ref VERIFIED_COMMITMENTS: IndexMap<String, VerifiableCommitment> = indexmap! {
        "ETHEREUM.BLOCKS".to_string() =>
            VerifiableCommitment {
                commitment: Bytes(hex::decode("000000000000000000000000000c2011000000000000001003b4e15a7c70fbe504638b8628d717e7afff3f733b5f1cdcc08f6b25cd4ff2f120fc19cf9ad833d764372c7b1b42b032618b82e2c521e43ebb5283593ecaf25c19454abebfa3728183fd7f9d557c51cc852945d46fa9536e7ba92804cd5cacb31a912e328996dfe65b1a1739e81254082af58b0ef8e3bce43ca75ec9ead85d3a0b9035706f0e30cfbafa5586803cc4fc1224571ade595ddff3cc60b5d8c2837f2010cd5c6c28f0ed280ddbee42991029c7d6e583b0b551c9c3a1ed0c05a12e480003055a961719b54c5e6a95a6b217d621b103fbf3026a93f737a0b8f318466c1bf0075ec0629a51fba7df9abcff2c448c632ae533893ecb3dc783b439b2d7c9264ccf84600882fe771e0dbe730586d63450394392f4e80537dbb5080e31becf1b671c159f45426ec2c838343f97b804e1850498f508ffa630d00092ecf12b742090e0f132599f69637a35ab9326f1a777751ec8e78238bbf51be73097238dc620a761b3a3f45704bdedd311357106cb32c5c9700709b04fe5d5fc5d20e94a610e1414ada45bea406ead799f48a07fd3c9c5c7849496d9582e5e0ce165a0c53e283c4faf6ef615dbc9f38bbb2b0763588793697d7469805cc92a2bc1d1d6b84306ea89369bbbdf881562270d6c1e9193af23e57c0e595be3bc416daef80870672f0bd6411d59c0de504b57d188efd14f313e0569ddc5af9d96f372aa6e551ea91ce98fff53eed8699ec7e3bcfb867efd7e45986407245bb3fedb5a7b7f742a1e2ea19193b7a0c7b909f0a35ed49f0f375c81f257b019e0e94c413609c0bb29f80dee06ef302b920892e024ae6be846e97acfbffe9a796e7b394b12979528f89f23cfba9125b94abf66bf4228880636e806dfb07690e80f51ba06dde2306b11ee04be2b243278da34217a4c3fe6ae7007d3ab79b021b1d81e1df02ec8f90d8eca09ed474ed244c356f836be4b4095fd4fdaa3f635055c7ca2307bed4ac87700400227b54ee1bc82e16cbc8eee72791df80fb1fdff7a955ae99428029360df1d141b9ca61cd2c076fbf85f4e42fc8e4b0a1dbe0eff657dbe5ca875e89a7bb36d841f417ae1ff0cb15a7ddf83c6fe53acda90a5a8cfcb9100af084da1321e803f6e290857e352582f11e6f065fed15ea9e69716dfda3b1364444a69e56ecf89d84a10539fbe349a4502942336bc2dafdbab5dcb74130bd4f94fb7293fdf5e2a59eb1e97b25b7fe0e31f513f116baa3fa6f68d197587b165a76a8a62d435c89396620c9895ea759f9fe6679b8e507a22ba13738aa5314914d8132e4e60c768bad96d05ae2f59982f6a201e6cd546e462eb46221b42456f2062971aa797d0a5551cc0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000a54494d455f5354414d5000000000090000000100000000000000070000000200000196a1640d7800000198ddf25518000000000000000c424c4f434b5f4e554d4245520000000005000000050000000200000000015615c50000000001623616000000000000000a424c4f434b5f48415348000000000b0000000000000000000000094741535f4c494d495400000000084b000000000000000000000000084741535f5553454400000000084b000000000000000000000000054d494e4552000000000b00000000000000000000000b504152454e545f48415348000000000b00000000000000000000000652455741524400000000084b0000000000000000000000000453495a45000000000500000005000000020000000000000499000000000017cdbe00000000000000115452414e53414354494f4e5f434f554e540000000004000000040000000200000000000007cb00000000000000054e4f4e4345000000000b00000000000000000000000d52454345495054535f524f4f54000000000b00000000000000000000000b534841335f554e434c4553000000000b00000000000000000000000a53544154455f524f4f54000000000b0000000000000000000000115452414e53414354494f4e535f524f4f54000000000b00000000000000000000000c554e434c45535f434f554e540000000005000000050000000200000000000000000000000000000000").unwrap()),
                merkle_proof: vec![
                    "0xc591dd7a0f71ddcdbc49bb4601c0a8ef5721c4e1aec7de08dfb95216143310ab".to_string(),
                    "0xa508cf57f9e22e629675fa8e2ef07708e3bed4d3308e4a6ec5166f00134146f6".to_string(),
                    "0x37fa633f0e1cb41b20c382f58e05f5547ef041a58c197abc6284dfc75706936b".to_string(),
                    "0x398b7fa36433b070a6c363c24c6b786383881941e760dfaecbf9802a171c34ce".to_string(),
                    "0xcc543be29599709b8d5f8b52cd6ee58da2060cf5328e52760ae68ac761412139".to_string(),
                    "0x22491678cfa13dba6c69e8f18e1b1aae340a7c52260134c1bd418fda62ed5504".to_string(),
                    "0x8f4a7c257a4ee573b2678443ab87d1eb9feeaba5853f245f5322550ad461a052".to_string(),
                    "0xc2e15ac3b9538584bf798ffc153fbd880695eeb33b9c5eb8c17852c9d8e008e3".to_string(),
                    "0x99707f09ba08de14bc32b48395d4fa2d0d830b340d26967a2f91a5386e31c9db".to_string()
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
            // First attestation
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: [
                        0xcf, 0x28, 0x35, 0xf2, 0x84, 0x1c, 0x4b, 0x00, 0x2b, 0xb4, 0xf2, 0xc4,
                        0x29, 0x6b, 0x7a, 0xb2, 0x2d, 0x48, 0xab, 0x09, 0x04, 0x3e, 0x11, 0xa3,
                        0x60, 0x8f, 0x6c, 0x36, 0xd0, 0x5d, 0xff, 0xd8,
                    ],
                    s: [
                        0x7e, 0xa6, 0x49, 0x69, 0xc5, 0x97, 0x7c, 0x5b, 0x40, 0xeb, 0x00, 0x26,
                        0xa5, 0x1e, 0xd6, 0x47, 0x8d, 0x7a, 0x57, 0x64, 0x7d, 0x45, 0xdb, 0x52,
                        0xf7, 0x4a, 0x06, 0xa4, 0xbb, 0x9f, 0x6a, 0x87,
                    ],
                    v: 0,
                },
                proposed_pub_key: hex::decode(
                    "02e6b88162d12753a7f9074ca32854bb9022941f2158f3f179212d1abb030125b3",
                )
                .unwrap(),
                address20: hex::decode("e7c9f4d5b48920f6e561b4889bb9bef9874c57e0").unwrap(),
                state_root: hex::decode(
                    "224e2267c840fb03813152cafb2e614ed98e1cabbbf8b133bf1ae7a6b466733c",
                )
                .unwrap(),
                block_number: 3842926,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "49faa2a069f6d70d326a9e36856f23dcf74aae49a839f91e4800e0ebd61417be",
                    )
                    .unwrap(),
                ),
            },
            // Second attestation
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: [
                        0x00, 0xf7, 0x24, 0xcb, 0x39, 0xfa, 0x60, 0xd3, 0xdd, 0xee, 0x13, 0xfc,
                        0xb9, 0xbb, 0x61, 0xef, 0x75, 0x88, 0x9e, 0x1d, 0xd7, 0x9f, 0x24, 0xea,
                        0x22, 0x36, 0x90, 0x5b, 0xee, 0x5b, 0x07, 0xa4,
                    ],
                    s: [
                        0x33, 0xa2, 0x5a, 0xf2, 0x16, 0x50, 0x28, 0x45, 0xef, 0x1b, 0x1c, 0xd2,
                        0x02, 0x34, 0x15, 0xdf, 0x7e, 0x91, 0x2c, 0x51, 0xfa, 0x92, 0x8a, 0xdc,
                        0x16, 0xc0, 0xc5, 0x02, 0x21, 0xac, 0x68, 0x12,
                    ],
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "03b1f15d1e2a19d0784547de80b271f28cc7aaed0030d8409f9462a94f920062f2",
                )
                .unwrap(),
                address20: hex::decode("8c2b9f40a674ca91f8ac5ff30eb17b80d768f209").unwrap(),
                state_root: hex::decode(
                    "224e2267c840fb03813152cafb2e614ed98e1cabbbf8b133bf1ae7a6b466733c",
                )
                .unwrap(),
                block_number: 3842926,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "49faa2a069f6d70d326a9e36856f23dcf74aae49a839f91e4800e0ebd61417be",
                    )
                    .unwrap(),
                ),
            },
            // Third attestation
            Attestation::EthereumAttestation {
                signature: EthereumSignature {
                    r: [
                        0x47, 0x1a, 0x93, 0x35, 0xe7, 0x1a, 0xe6, 0x13, 0xde, 0x8f, 0xb3, 0xf3,
                        0xcc, 0x92, 0xda, 0x51, 0x91, 0xcc, 0xf6, 0x67, 0x80, 0x4a, 0x56, 0x69,
                        0x46, 0x73, 0x4d, 0x67, 0xff, 0xe0, 0xf4, 0xfd,
                    ],
                    s: [
                        0x66, 0x16, 0x14, 0x8f, 0xbd, 0x82, 0x72, 0x81, 0x27, 0x09, 0xe8, 0xf3,
                        0xdc, 0xff, 0x38, 0x05, 0x28, 0x77, 0x32, 0xe9, 0x56, 0xdd, 0xb2, 0xae,
                        0x97, 0x1e, 0x85, 0x24, 0x57, 0x79, 0xac, 0x4c,
                    ],
                    v: 1,
                },
                proposed_pub_key: hex::decode(
                    "0259fa36fd0d3fc21ba33904a68d6af18edf59bf5a9c1cc31dda371d3f38993bc9",
                )
                .unwrap(),
                address20: hex::decode("813d6af4222a6b8ea3237f3a9eb7a9d58ade2ace").unwrap(),
                state_root: hex::decode(
                    "224e2267c840fb03813152cafb2e614ed98e1cabbbf8b133bf1ae7a6b466733c",
                )
                .unwrap(),
                block_number: 3842926,
                block_hash: H256::from_slice(
                    &hex::decode(
                        "49faa2a069f6d70d326a9e36856f23dcf74aae49a839f91e4800e0ebd61417be",
                    )
                    .unwrap(),
                ),
            },
        ];

        let result = verify_attestations(
            &attestations,
            &VERIFIED_COMMITMENTS,
            CommitmentScheme::HyperKzg,
        );
        assert!(result.is_ok(), "Verification failed: {:?}", result);
    }
}
