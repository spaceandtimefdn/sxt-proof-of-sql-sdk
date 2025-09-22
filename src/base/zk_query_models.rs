//! Models for ZK Query API requests and responses
use clap::ValueEnum;
use serde::{Deserialize, Serialize};

/// The request model to get a proof plan
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryPlanRequest {
    /// The sql text to get the plan for
    pub sql_text: String,
    /// The underlying data source
    #[serde(default)]
    pub source_network: SxtNetwork,
    #[serde(default = "default_evm_compatible")]
    pub evm_compatible: bool,
}

fn default_evm_compatible() -> bool {
    true
}

/// The return model with the proof plan
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryPlanResponse {
    /// The serialized proof plan
    pub plan: String,
}

/// The source of the underlying data
#[derive(Serialize, Deserialize, Debug, PartialEq, Default, Clone, Copy, Eq, ValueEnum)]
#[serde(rename_all = "camelCase")]
pub enum SxtNetwork {
    /// For now at least, this is the only value that is used
    #[default]
    Mainnet,
    Testnet,
}
