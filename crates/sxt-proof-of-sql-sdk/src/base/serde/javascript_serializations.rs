use crate::base::{
    commitment_scheme::HYPER_KZG_VERIFIER_SETUP_BYTES,
    javascript_friendly_types::{Failure, JSFriendlyColumn, VerificationStatus},
    serde::verifying_configuration::VerifyingConfiguration,
    zk_query_models::QueryResultsResponse,
};
use indexmap::IndexMap;
use nova_snark::provider::hyperkzg::VerifierKey;
use proof_of_sql::{
    base::try_standard_binary_deserialization, proof_primitive::hyperkzg::HyperKZGEngine,
};

const SERIALIZATION_FAILED_MESSAGE: &str =
    "{\"verificationStatus\":\"Failure\",\"error\":\"Serialization\",\"message\":\"failed to serialize result\"}";

/// Convert a result table to a JSON string. This handles converting bigger integer types to string for easier handling by javascript.
/// Additionally, any errors are recorded in a javascript friendly result type.
pub(crate) fn serialize_javascript_friendly_type(
    result: VerificationStatus<IndexMap<String, JSFriendlyColumn>>,
) -> String {
    serde_json::to_string(&result).unwrap_or_else(|_| SERIALIZATION_FAILED_MESSAGE.to_string())
}

pub(crate) fn deserialize_query_results_from_javascript(
    query_results_json: String,
) -> Result<QueryResultsResponse, Failure> {
    serde_json::from_str(&query_results_json).map_err(|err| {
        Failure::QueryResultsDeserialization(format!("Error deserializing query results: {}", err))
    })
}

pub(crate) fn deserialize_verifying_configuration_from_javascript(
    verifying_configuration: String,
) -> Result<VerifyingConfiguration, Failure> {
    serde_json::from_str(&verifying_configuration).map_err(|err| {
        Failure::VerifyingConfigurationDeserialization(format!(
            "Error deserializing verifying configuration: {}",
            err
        ))
    })
}

pub(crate) fn deserialize_verifier_key() -> VerifierKey<HyperKZGEngine> {
    // This should never fail, so no need to add an extra error type for typescript to handle.
    try_standard_binary_deserialization(HYPER_KZG_VERIFIER_SETUP_BYTES)
        .expect("Verifier setup unexpectedly failed to deserialize")
        .0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::base::javascript_friendly_types::Failure;

    #[test]
    fn confirm_last_ditch_error_follows_serialization_correctly() {
        let res = serde_json::to_string(&VerificationStatus::<JSFriendlyColumn>::Failure(
            Failure::Serialization("failed to serialize result".to_string()),
        ))
        .unwrap();
        assert_eq!(res, SERIALIZATION_FAILED_MESSAGE);
    }
}
