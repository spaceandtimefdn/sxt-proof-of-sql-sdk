mod args;
use crate::args::ProducePlanArgs;
use clap::Parser;
use proof_of_sql::{base::try_standard_binary_serialization, sql::evm_proof_plan::EVMProofPlan};
use sxt_proof_of_sql_sdk::native::produce_plan;

#[tokio::main]
async fn main() -> Result<(), Box<dyn core::error::Error>> {
    // Parse command-line arguments
    let args = ProducePlanArgs::parse();

    // Retrieve the proof plan
    let plan = produce_plan(args.substrate_node_url, &args.query, args.block_hash).await?;

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
