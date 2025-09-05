use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QuerySubmitRequest {
    pub sql_text: String,
    pub source_network: String,
    pub timeout: Option<i64>,
    pub commitment_scheme: Option<String>,
}
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QuerySubmitResponse {
    pub query_id: String,
    pub created: String,
    pub commitment_scheme: String,
}
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryResultsResponse {
    pub query_id: String,
    pub created: String,
    pub commitment_scheme: String,
    pub success: bool,
    pub canceled: bool,
    pub error: Option<String>,
    pub completed: String,
    pub plan: String,
    pub proof: String,
    pub results: String,
}
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryStatusResponse {
    pub query_id: String,
    pub created: String,
    pub commitment_scheme: String,
    pub status: ZkQueryStatus,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryPlanRequest {
    pub sql_text: String,
    #[serde(default)]
    pub source_network: SxtNetwork,
    #[serde(default = "default_evm_compatible")]
    pub evm_compatible: bool,
}

fn default_evm_compatible() -> bool {
    true
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryPlanResponse {
    pub plan: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub enum SxtNetwork {
    #[default]
    Mainnet,
    Testnet,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ZkQueryStatus {
    Queued,
    Running,
    Done,
    Canceled,
    Failed,
    Unknown,
}
