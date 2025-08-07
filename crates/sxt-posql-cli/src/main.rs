mod args;
mod query_and_verify;

use crate::{
    args::{ProofOfSqlSdkArgs, ProofOfSqlSdkSubcommands},
    query_and_verify::query_and_verify,
};
use clap::Parser;
use dotenv::dotenv;

#[tokio::main]
async fn main() -> Result<(), Box<dyn core::error::Error>> {
    // Load environment variables from .env file, if available
    dotenv().ok();

    // Parse command-line arguments
    let sdk_args = ProofOfSqlSdkArgs::parse();
    match sdk_args.command {
        ProofOfSqlSdkSubcommands::QueryAndVerify(args) => query_and_verify(args).await,
    }
}
