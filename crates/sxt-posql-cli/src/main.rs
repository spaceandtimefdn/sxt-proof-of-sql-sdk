mod args;

use crate::args::SdkArgs;
use clap::Parser;
use dotenv::dotenv;

#[tokio::main]
async fn main() -> Result<(), Box<dyn core::error::Error>> {
    // Load environment variables from .env file, if available
    dotenv().ok();

    // Parse command-line arguments
    let args = SdkArgs::parse();
    let (client, commitment_scheme) = (&args).into();

    // Execute the query and verify the result
    let result = client
        .query_and_verify(&args.query, args.block_hash, commitment_scheme)
        .await?;

    // Print the result of the query
    println!("Query result: {:?}", result);

    Ok(())
}
