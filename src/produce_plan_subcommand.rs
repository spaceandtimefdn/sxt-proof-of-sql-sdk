use crate::native::produce_plan;
use clap::Parser;
use proof_of_sql::{base::try_standard_binary_serialization, sql::evm_proof_plan::EVMProofPlan};
use subxt::utils::H256;
use url::Url;

#[derive(Parser, Debug, Clone, PartialEq, Eq)]
#[command(
    name = "Proof of SQL Plan Producer",
    version = "1.0",
    about = "Produces the proof plan for a sql query."
)]
pub struct ProducePlanArgs {
    /// Url from which to retrieve the table schemas
    #[arg(
        long,
        default_value = "wss://rpc.testnet.sxt.network",
        env = "SUBSTRATE_NODE_URL"
    )]
    pub substrate_node_url: Url,
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
    #[arg(long, default_value = "true")]
    pub evm: bool,
}

pub async fn produce_plan_command(
    args: ProducePlanArgs,
) -> Result<(), Box<dyn core::error::Error>> {
    // Retrieve the proof plan
    let plan = produce_plan(
        args.substrate_node_url.as_str(),
        &args.query,
        args.block_hash,
    )
    .await?;

    if args.debug_plan {
        println!("{:?}", plan);
    } else if args.evm {
        let serialized = hex::encode(try_standard_binary_serialization(EVMProofPlan::new(plan))?);
        println!("0x{}", serialized);
    } else {
        let serialized = hex::encode(try_standard_binary_serialization(plan)?);
        println!("0x{}", serialized);
    }

    Ok(())
}
