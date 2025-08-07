use serde::{de::Error, Deserialize, Deserializer, Serialize, Serializer};

/// Custom serialization for `prost_types::Duration` for protobuf compatibility.
pub fn serialize<S>(
    duration: &Option<prost_types::Duration>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match duration {
        Some(d) => d.to_string().serialize(serializer),
        None => serializer.serialize_none(),
    }
}

pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<prost_types::Duration>, D::Error>
where
    D: Deserializer<'de>,
{
    // Expect either `null` or a string
    let maybe_string = Option::<String>::deserialize(deserializer)?;
    match maybe_string {
        Some(s) => {
            // Attempt to parse the string into `prost_types::Duration`
            let duration = s
                .parse::<prost_types::Duration>()
                .map_err(D::Error::custom)?;
            Ok(Some(duration))
        }
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use prost_types::Duration;

    #[derive(Deserialize, Serialize)]
    struct TestDuration {
        #[serde(serialize_with = "serialize", deserialize_with = "deserialize")]
        duration: Option<Duration>,
    }

    #[test]
    fn test_serialize_and_deserialize_some_duration() {
        let td = TestDuration {
            duration: Some(Duration {
                seconds: 42,
                nanos: 123,
            }),
        };
        let json = serde_json::to_string(&td).unwrap();
        assert!(json.contains("42"));
        assert!(json.contains("123"));
        let roundtripped: Duration = serde_json::from_str::<TestDuration>(&json)
            .unwrap()
            .duration
            .unwrap();
        assert_eq!(roundtripped.seconds, 42);
        assert_eq!(roundtripped.nanos, 123);
    }

    #[test]
    fn test_serialize_and_deserialize_no_duration() {
        let td = TestDuration { duration: None };
        let json = serde_json::to_string(&td).unwrap();
        assert_eq!(json, r#"{"duration":null}"#);
        assert!(serde_json::from_str::<TestDuration>(&json)
            .unwrap()
            .duration
            .is_none());
    }
}
