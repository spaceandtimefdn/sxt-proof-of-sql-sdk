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

#[cfg(test)]
mod tests {
    use sp_core::Bytes;

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
}
