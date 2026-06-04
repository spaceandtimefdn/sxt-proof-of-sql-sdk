use super::hex::{deserialize_address_array_as_hex, deserialize_bytes_hex};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VerifyingConfiguration {
    #[serde(deserialize_with = "deserialize_address_array_as_hex")]
    valid_attestors: Vec<[u8; 20]>,
    #[serde(deserialize_with = "deserialize_bytes_hex")]
    proof_plan: Vec<u8>,
}

impl VerifyingConfiguration {
    pub fn valid_attestors(self) -> Vec<[u8; 20]> {
        self.valid_attestors
    }

    pub fn proof_plan(&self) -> &Vec<u8> {
        &self.proof_plan
    }
}
