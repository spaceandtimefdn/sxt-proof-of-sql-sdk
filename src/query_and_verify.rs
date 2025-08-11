use crate::{base::CommitmentScheme, native::SxTClient};
use clap::Args;
use subxt::utils::H256;

#[derive(Args, Debug, Clone, PartialEq, Eq)]
pub struct QueryAndVerifySdkArgs {
    /// Root URL for the Prover service
    ///
    /// This URL is used for interacting with the prover service.
    /// Can be set via PROVER_ROOT_URL environment variable.
    #[arg(
        long,
        value_name = "PROVER_ROOT_URL",
        default_value = "https://api.makeinfinite.dev",
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
        default_value = "https://proxy.api.makeinfinite.dev",
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

    /// SxT chain block hash to perform the query at.
    #[arg(long)]
    pub block_hash: Option<H256>,

    /// Commitment scheme to use for the query
    #[arg(
        long,
        value_enum,
        env,
        default_value_t = CommitmentScheme::HyperKzg,
    )]
    pub commitment_scheme: CommitmentScheme,

    /// Path to the verifier setup binary file
    ///
    /// Specifies the path to the verifier setup binary file required for verification.
    /// If commitment_scheme is HyperKZG, the default is "verifier_setups/hyper-kzg.bin".
    /// If commitment_scheme is DynamicDory, the default is "verifier_setups/dynamic-dory.bin".
    #[arg(
        long,
        value_name = "VERIFIER_SETUP",
        help = "Path to the verifier setup file. Defaults to verifier_setups/hyper-kzg.bin for HyperKZG or verifier_setups/dynamic-dory.bin for DynamicDory."
    )]
    pub verifier_setup: Option<String>,
}

impl From<&QueryAndVerifySdkArgs> for (SxTClient, CommitmentScheme) {
    fn from(args: &QueryAndVerifySdkArgs) -> Self {
        let verifier_setup = match (args.verifier_setup.as_deref(), args.commitment_scheme) {
            (Some(path), _) => path.to_string(),
            (None, CommitmentScheme::HyperKzg) => "verifier_setups/hyper-kzg.bin".to_string(),
            (None, CommitmentScheme::DynamicDory) => "verifier_setups/dynamic-dory.bin".to_string(),
        };
        (
            SxTClient::new(
                args.prover_root_url.clone(),
                args.auth_root_url.clone(),
                args.substrate_node_url.clone(),
                args.sxt_api_key.clone(),
                verifier_setup,
            ),
            args.commitment_scheme,
        )
    }
}

pub async fn query_and_verify(
    args: QueryAndVerifySdkArgs,
) -> Result<(), Box<dyn core::error::Error>> {
    let (client, commitment_scheme) = (&args).into();

    // Execute the query and verify the result
    let result = client
        .query_and_verify(&args.query, args.block_hash, commitment_scheme)
        .await?;

    // Print the result of the query
    println!("Query result: {:?}", result);
    Ok(())
}
