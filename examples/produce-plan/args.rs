use clap::Parser;
use subxt::utils::H256;

#[derive(Parser, Debug, Clone, PartialEq, Eq)]
#[command(
    name = "Proof of SQL Plan Producer",
    version = "1.0",
    about = "Produces the proof plan for a sql query."
)]
pub(super) struct ProducePlanArgs {
    /// Url from which to retrieve the table schemas
    #[arg(
        long,
        default_value = "wss://rpc.testnet.sxt.network",
        env = "SUBSTRATE_NODE_URL"
    )]
    pub substrate_node_url: String,
    /// SQL query to retrieve a plan for
    #[arg(short, long)]
    pub query: String,

    /// SxT chain block hash to perform the query at.
    #[arg(long)]
    pub block_hash: Option<H256>,

    /// Display the plan unserialized
    #[arg(long, default_value = "false")]
    pub debug_plan: bool,

    /// Display the result as serialized hex code of the evm plan
    #[arg(long, default_value = "false")]
    pub evm: bool,
}
