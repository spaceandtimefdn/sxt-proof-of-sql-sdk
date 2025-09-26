use serde::{Deserialize, Deserializer, Serialize, Serializer};
use sp_core::Bytes;

/// Hex serialization function.
///
/// Can be used in `#[serde(serialize_with = "")]` attributes for any `AsRef<[u8]>` type.
pub fn serialize_bytes_hex<S>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    Bytes(bytes.to_vec()).serialize(serializer)
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
        .map(|bytes| Bytes(bytes.to_vec()))
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
    let b = Bytes::deserialize(deserializer)?;
    Ok(b.0)
}

/// Hex deserialization function.
///
/// Can be used in `#[serde(deserialize_with = "deserialize_bytes_hex32")]`
/// for any `[u8; 32]` type.
pub fn deserialize_bytes_hex32<'de, D>(deserializer: D) -> Result<[u8; 32], D::Error>
where
    D: Deserializer<'de>,
{
    let b = Bytes::deserialize(deserializer)?;
    b.0.try_into()
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
    let bytes32_array = Vec::<Bytes>::deserialize(deserializer)?;
    bytes32_array
        .into_iter()
        .map(|b| {
            b.0.try_into()
                .map_err(|_| serde::de::Error::custom("Invalid length"))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::base::serde::hex::{
        deserialize_bytes32_array_as_hex, serialize_bytes32_array_as_hex,
    };
    use serde::{Deserialize, Serialize};
    use sp_core::Bytes;

    #[derive(Serialize, Deserialize, PartialEq, Debug)]
    struct Bytes32ArrayWrapper {
        /// The bytes32 array.
        #[serde(
            serialize_with = "serialize_bytes32_array_as_hex",
            deserialize_with = "deserialize_bytes32_array_as_hex"
        )]
        pub value: Vec<[u8; 32]>,
    }

    #[test]
    fn test_serialize_bytes_hex() {
        let bytes = vec![0xde, 0xad, 0xbe, 0xef];
        let serialized = serde_json::to_string(&Bytes(bytes.clone())).unwrap();
        assert_eq!(serialized, "\"0xdeadbeef\"");
    }

    #[test]
    fn test_deserialize_bytes_hex() {
        let json = "\"0xdeadbeef\"";
        let bytes: Bytes = serde_json::from_str(json).unwrap();
        assert_eq!(bytes.0, vec![0xde, 0xad, 0xbe, 0xef]);
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
}
