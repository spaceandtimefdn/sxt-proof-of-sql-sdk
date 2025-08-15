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
