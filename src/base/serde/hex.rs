use hex::FromHexError;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// Function for decoding a hex string with optional "0x" prefix into bytes.
fn from_hex(hex: &str) -> Result<Vec<u8>, FromHexError> {
    hex::decode(hex.strip_prefix("0x").unwrap_or(hex))
}

/// Function for encoding bytes into a hex string with "0x" prefix.
fn to_hex(bytes: &Vec<u8>) -> String {
    let hex = hex::encode(bytes);
    format!("0x{}", hex)
}

/// Hex serialization function.
///
/// Can be used in `#[serde(serialize_with = "")]` attributes for any `AsRef<[u8]>` type.
pub fn serialize_bytes_hex<S>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&to_hex(&bytes.to_vec()))
}

/// Serialization function for encoding `Vec<[u8; 32]>` objects as hex strings with a leading `0x`.
///
/// Can be used in `#[serde(serialize_with = "serialize_bytes32_array_as_hex")]`
/// for any `Vec<[u8; 32]>` field.
pub fn serialize_bytes32_array_as_hex<S>(
    bytes_array: &[[u8; 32]],
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    bytes_array
        .iter()
        .map(|bytes| to_hex(&bytes.to_vec()))
        .collect::<Vec<_>>()
        .serialize(serializer)
}

/// Hex deserialization function.
///
/// Can be used in `#[serde(deserialize_with = "deserialize_bytes_hex")]`
/// for any `Vec<u8>` type.
pub fn deserialize_bytes_hex<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
where
    D: Deserializer<'de>,
{
    let b = String::deserialize(deserializer)?;
    from_hex(&b).map_err(serde::de::Error::custom)
}

/// Hex deserialization function.
///
/// Can be used in `#[serde(deserialize_with = "deserialize_bytes_hex32")]`
/// for any `[u8; 32]` type.
pub fn deserialize_bytes_hex32<'de, D>(deserializer: D) -> Result<[u8; 32], D::Error>
where
    D: Deserializer<'de>,
{
    let b = String::deserialize(deserializer)?;
    from_hex(&b)
        .map_err(serde::de::Error::custom)?
        .try_into()
        .map_err(|_| serde::de::Error::custom("Invalid length"))
}

/// Deserialization function for `Vec<[u8; 32]>` objects that are encoded as hex strings with a leading `0x`.
///
/// Can be used in `#[serde(deserialize_with = "deserialize_bytes32_array_as_hex")]`
/// for any `Vec<[u8; 32]>` field.
pub fn deserialize_bytes32_array_as_hex<'de, D>(deserializer: D) -> Result<Vec<[u8; 32]>, D::Error>
where
    D: Deserializer<'de>,
{
    let bytes32_array = Vec::<String>::deserialize(deserializer)?;
    bytes32_array
        .into_iter()
        .map(|b| {
            from_hex(&b)
                .map_err(serde::de::Error::custom)?
                .try_into()
                .map_err(|_| serde::de::Error::custom("Invalid length"))
        })
        .collect()
}

/// Serialization function for encoding `Vec<Vec<u8>>` objects as hex strings with a leading `0x`.
///
/// Can be used in `#[serde(serialize_with = "serialize_bytes_array_as_hex")]`
/// for any `Vec<Vec<u8>>` field.
pub fn serialize_bytes_array_as_hex<S>(
    bytes_array: &[Vec<u8>],
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    bytes_array
        .iter()
        .map(|bytes| to_hex(&bytes.to_vec()))
        .collect::<Vec<_>>()
        .serialize(serializer)
}

/// Deserialization function for `Vec<Vec<u8>>` objects that are encoded as hex strings with a leading `0x`.
///
/// Can be used in `#[serde(deserialize_with = "deserialize_bytes_array_as_hex")]`
/// for any `Vec<Vec<u8>>` field.
pub fn deserialize_bytes_array_as_hex<'de, D>(deserializer: D) -> Result<Vec<Vec<u8>>, D::Error>
where
    D: Deserializer<'de>,
{
    let bytes_array = Vec::<String>::deserialize(deserializer)?;
    bytes_array
        .into_iter()
        .map(|b| from_hex(&b).map_err(serde::de::Error::custom))
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::base::serde::hex::{
        deserialize_bytes32_array_as_hex, deserialize_bytes_hex, serialize_bytes32_array_as_hex,
        serialize_bytes_hex,
    };
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, PartialEq, Debug)]
    struct Bytes32ArrayWrapper {
        /// The bytes32 array.
        #[serde(
            serialize_with = "serialize_bytes32_array_as_hex",
            deserialize_with = "deserialize_bytes32_array_as_hex"
        )]
        pub value: Vec<[u8; 32]>,
    }

    #[derive(Serialize, Deserialize, PartialEq, Debug)]
    struct BytesWrapper {
        /// The bytes32 array.
        #[serde(
            serialize_with = "serialize_bytes_hex",
            deserialize_with = "deserialize_bytes_hex"
        )]
        pub value: Vec<u8>,
    }

    #[test]
    fn we_can_roundtrip_bytes32_array_as_hex() {
        let bytes_array = Bytes32ArrayWrapper {
            value: vec![[1u8; 32], [2; 32]],
        };
        let serialized = serde_json::to_string(&bytes_array).unwrap();
        assert_eq!(serialized, "{\"value\":[\"0x0101010101010101010101010101010101010101010101010101010101010101\",\"0x0202020202020202020202020202020202020202020202020202020202020202\"]}");
        let deserialized: Bytes32ArrayWrapper = serde_json::from_str(&serialized).unwrap();
        assert_eq!(bytes_array, deserialized);
    }

    #[test]
    fn we_can_roundtrip_empty_bytes() {
        let bytes_array = BytesWrapper { value: vec![] };
        let serialized = serde_json::to_string(&bytes_array).unwrap();
        assert_eq!(serialized, "{\"value\":\"0x\"}");
        let deserialized: BytesWrapper = serde_json::from_str(&serialized).unwrap();
        assert_eq!(bytes_array, deserialized);
    }

    #[test]
    fn we_can_roundtrip_nonempty_bytes() {
        let bytes_array = BytesWrapper {
            value: vec![1u8, 40],
        };
        let serialized = serde_json::to_string(&bytes_array).unwrap();
        assert_eq!(serialized, "{\"value\":\"0x0128\"}");
        let deserialized: BytesWrapper = serde_json::from_str(&serialized).unwrap();
        assert_eq!(bytes_array, deserialized);
    }
}
