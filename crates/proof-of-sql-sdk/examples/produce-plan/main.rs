mod args;
use crate::args::ProducePlanArgs;
use clap::Parser;
use proof_of_sql::base::try_standard_binary_serialization;
use sxt_proof_of_sql_sdk::produce_plan;

#[tokio::main]
async fn main() -> Result<(), Box<dyn core::error::Error>> {
    // Parse command-line arguments
    let args = ProducePlanArgs::parse();

    // Retrieve the proof plan
    let plan = produce_plan(args.substrate_node_url, &args.query, args.block_hash).await?;

    if args.display_as_hex_code {
        let serialized = hex::encode(try_standard_binary_serialization(plan).unwrap());
        println!("{:?}", serialized);
    } else {
        println!("{:?}", plan);
    }

    Ok(())
}
