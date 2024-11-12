use clap::Parser;
use sxt_proof_of_sql_sdk::{PostprocessingLevel, SxTClient};

/// Struct to define and parse command-line arguments for Proof of SQL Client.
///
/// Supports environment variables and defaults for certain options.
/// Environment variables are prioritized only if the argument is not passed
/// via the command line.
#[derive(Parser, Debug, Clone, PartialEq, Eq)]
#[command(
    name = "Proof of SQL Client",
    version = "1.0",
    about = "Runs a SQL query and verifies the result using Dynamic Dory."
)]
pub struct SdkArgs {
    /// Root URL for the Prover service
    ///
    /// This URL is used for interacting with the prover service.
    /// Can be set via PROVER_ROOT_URL environment variable.
    #[arg(
        long,
        value_name = "PROVER_ROOT_URL",
        default_value = "https://api.spaceandtime.dev",
        env = "PROVER_ROOT_URL"
    )]
    pub prover_root_url: String,

    /// Root URL for the Auth service
    ///
    /// Used for authentication requests.
    /// Can be set via AUTH_ROOT_URL environment variable.
    #[arg(
        long,
        value_name = "AUTH_ROOT_URL",
        default_value = "https://proxy.api.spaceandtime.dev",
        env = "AUTH_ROOT_URL"
    )]
    pub auth_root_url: String,

    /// URL for the Substrate node service
    ///
    /// Specifies the Substrate node endpoint used for accessing commitment data.
    /// Can be set via SUBSTRATE_NODE_URL environment variable.
    #[arg(
        long,
        value_name = "SUBSTRATE_NODE_URL",
        default_value = "wss://rpc.testnet.sxt.network",
        env = "SUBSTRATE_NODE_URL"
    )]
    pub substrate_node_url: String,

    /// API Key for Space and Time (SxT) services
    ///
    /// The API key required for authorization with Space and Time services.
    /// Can be set via SXT_API_KEY environment variable.
    #[arg(long, value_name = "SXT_API_KEY", env = "SXT_API_KEY")]
    pub sxt_api_key: String,

    /// SQL query to execute and verify
    #[arg(short, long, value_name = "QUERY", help = "SQL query to run")]
    pub query: String,

    /// Table reference for the SQL query in the format `schema.table`
    #[arg(
        long,
        value_name = "TABLE_REF",
        help = "Table reference in format schema.table"
    )]
    pub table_ref: String,

    /// Path to the verifier setup binary file
    ///
    /// Specifies the path to the `verifier_setup.bin` file required for verification.
    /// Default path is `verifier_setup.bin` in the current directory.
    #[arg(
        long,
        value_name = "VERIFIER_SETUP",
        help = "Path to the verifier setup file",
        default_value = "verifier_setup.bin"
    )]
    pub verifier_setup: String,

    /// Level of postprocessing allowed. Default is `Cheap`.
    #[arg(
        long,
        value_name = "POSTPROCESSING_LEVEL",
        default_value = "cheap",
        value_enum,
        help = "Level of postprocessing allowed, default is `Cheap`"
    )]
    pub postprocessing_level: PostprocessingLevel,
}

impl From<&SdkArgs> for SxTClient {
    fn from(args: &SdkArgs) -> Self {
        Self::new(
            args.prover_root_url.clone(),
            args.auth_root_url.clone(),
            args.substrate_node_url.clone(),
            args.sxt_api_key.clone(),
            args.verifier_setup.clone(),
        )
        .with_postprocessing(args.postprocessing_level)
    }
}
