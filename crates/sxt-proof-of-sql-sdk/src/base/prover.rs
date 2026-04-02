/// First value of enum is default value, so if no commitment
/// scheme is specified in ProverQuery, IPA is chosen by default
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[repr(i32)]
pub enum CommitmentScheme {
    Ipa = 0,
    DynamicDory = 1,
    HyperKzg = 2,
}
