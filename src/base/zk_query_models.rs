//! Models for ZK Query API requests and responses
use crate::base::{
    prover::CommitmentScheme,
    serde::hex::{
        deserialize_bytes32_array_as_hex, deserialize_bytes_hex, deserialize_bytes_hex32,
        serialize_bytes32_array_as_hex, serialize_bytes_hex,
    },
};
use clap::ValueEnum;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

/// The request model for running a zk query model
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QuerySubmitRequest {
    /// The query to run
    pub sql_text: String,
    /// The source of the underlying data
    pub source_network: SxtNetwork,
    pub timeout: Option<i64>,
    /// The commitment scheme to use for the query
    pub commitment_scheme: Option<CommitmentScheme>,
    /// The block hash of the data to use
    pub block_hash: Option<String>,
}

/// The response to the initial zk query request
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QuerySubmitResponse {
    /// The job number corresponding to the initial query
    pub query_id: uuid::Uuid,
    pub created: String,
    /// The commitment scheme used for the query
    pub commitment_scheme: CommitmentScheme,
}

/// The table commitments with the merkle proof of the commitments
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TableCommitmentWithProof {
    pub commitment: String,
    pub merkle_proof: Vec<String>,
}

/// The commitments along with the attestations for those commitments
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AttestedCommitments {
    pub commitments: IndexMap<String, TableCommitmentWithProof>,
    /// The `r` component of the signature.
    #[serde(
        serialize_with = "serialize_bytes32_array_as_hex",
        deserialize_with = "deserialize_bytes32_array_as_hex"
    )]
    pub r: Vec<[u8; 32]>,
    /// The `s` component of the signature.
    #[serde(
        serialize_with = "serialize_bytes32_array_as_hex",
        deserialize_with = "deserialize_bytes32_array_as_hex"
    )]
    pub s: Vec<[u8; 32]>,
    pub v: Vec<u8>,
    pub block_number: u64,
    #[serde(
        serialize_with = "serialize_bytes_hex",
        deserialize_with = "deserialize_bytes_hex32"
    )]
    pub block_hash: [u8; 32],
}

/// The results of the query
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryResultsResponse {
    /// The job number corresponding to the initial query
    pub query_id: uuid::Uuid,
    pub created: String,
    /// The commitment scheme used for the query
    pub commitment_scheme: CommitmentScheme,
    pub commitments: AttestedCommitments,
    pub success: bool,
    pub canceled: bool,
    pub error: Option<String>,
    pub completed: String,
    /// The proof plan bytes
    #[serde(
        serialize_with = "serialize_bytes_hex",
        deserialize_with = "deserialize_bytes_hex"
    )]
    pub plan: Vec<u8>,
    /// The proof bytes
    #[serde(
        serialize_with = "serialize_bytes_hex",
        deserialize_with = "deserialize_bytes_hex"
    )]
    pub proof: Vec<u8>,
    /// The result bytes
    #[serde(
        serialize_with = "serialize_bytes_hex",
        deserialize_with = "deserialize_bytes_hex"
    )]
    pub results: Vec<u8>,
}

/// The status of a query
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryStatusResponse {
    /// The job number corresponding to the initial query
    pub query_id: uuid::Uuid,
    pub created: String,
    pub commitment_scheme: CommitmentScheme,
    /// The status of the query
    pub status: ZkQueryStatus,
}

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

/// The eligible values for status
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ZkQueryStatus {
    /// The job is not yet running, but is queued
    Queued,
    /// The zk query is actively being processed
    Running,
    /// The zk query has successfully been completed
    Done,
    /// The zk query was canceled
    Canceled,
    /// the query failed
    Failed,
    /// The status is unkown
    Unknown,
}
