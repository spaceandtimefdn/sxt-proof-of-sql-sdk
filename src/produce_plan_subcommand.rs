use crate::{base::zk_query_models::SxtNetwork, native::produce_plan};
use clap::Parser;
use proof_of_sql::base::try_standard_binary_serialization;
use url::Url;

#[derive(Parser, Debug, Clone, PartialEq, Eq)]
#[command(
    name = "Proof of SQL Plan Producer",
    version = "1.0",
    about = "Produces the proof plan for a sql query."
)]
pub struct ProducePlanArgs {
    /// SXT Network
    ///
    /// The SXT network to use.
    /// Can be set via SXT_NETWORK environment variable.
    #[arg(
        long,
        value_enum,
        default_value_t = SxtNetwork::Mainnet,
        env = "SXT_NETWORK"
    )]
    pub network: SxtNetwork,

    /// Root URL for SXT services
    ///
    /// This URL is used as the base for other service URLs.
    /// Can be set via ROOT_URL environment variable.
    #[arg(
        long,
        value_name = "ROOT_URL",
        default_value = "https://api.makeinfinite.dev",
        env = "ROOT_URL"
    )]
    pub root_url: Url,

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
    pub auth_root_url: Url,

    /// API Key for Space and Time (SxT) services
    ///
    /// The API key required for authorization with Space and Time services.
    /// Can be set via SXT_API_KEY environment variable.
    #[arg(long, value_name = "SXT_API_KEY", env = "SXT_API_KEY")]
    pub sxt_api_key: String,

    /// SQL query to retrieve a plan for
    #[arg(short, long, value_name = "QUERY", help = "SQL query to run")]
    pub query: String,

    /// Display the plan unserialized
    #[arg(long, default_value = "false")]
    pub debug_plan: bool,
}

pub async fn produce_plan_command(
    args: ProducePlanArgs,
) -> Result<(), Box<dyn core::error::Error>> {
    // Retrieve the proof plan
    let plan = produce_plan(
        args.root_url,
        args.auth_root_url,
        &args.sxt_api_key,
        &args.query,
        args.network,
    )
    .await?;

    if args.debug_plan {
        println!("{:?}", plan);
    } else {
        let serialized = hex::encode(try_standard_binary_serialization(plan)?);
        println!("0x{}", serialized);
    }

    Ok(())
}
