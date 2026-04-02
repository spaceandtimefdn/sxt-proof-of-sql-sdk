use clap::Parser;
use dotenv::dotenv;
use sxt_proof_of_sql_sdk::{
    args::{ProofOfSqlSdkArgs, ProofOfSqlSdkSubcommands},
    produce_plan_subcommand::produce_plan_command,
    query_and_verify::query_and_verify,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn core::error::Error>> {
    // Load environment variables from .env file, if available
    dotenv().ok();

    // Parse command-line arguments
    let sdk_args = ProofOfSqlSdkArgs::parse();
    match sdk_args.command {
        ProofOfSqlSdkSubcommands::QueryAndVerify(args) => query_and_verify(*args).await,
        ProofOfSqlSdkSubcommands::ProducePlan(args) => produce_plan_command(*args).await,
    }
}
