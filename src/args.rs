use crate::{produce_plan_subcommand::ProducePlanArgs, query_and_verify::QueryAndVerifySdkArgs};
use clap::{Parser, Subcommand};

/// Struct to define and parse command-line arguments for Proof of SQL Client.
///
/// Supports environment variables and defaults for certain options.
/// Environment variables are prioritized only if the argument is not passed
/// via the command line.
#[derive(Parser, Debug, Clone, PartialEq, Eq)]
#[command(
    name = "Proof of SQL Client",
    version = "1.0",
    about = "Proof of SQL SDK Command Line Interface"
)]
pub struct ProofOfSqlSdkArgs {
    #[command(subcommand)]
    pub command: ProofOfSqlSdkSubcommands,
}

#[derive(Subcommand, Debug, Clone, PartialEq, Eq)]
pub enum ProofOfSqlSdkSubcommands {
    QueryAndVerify(Box<QueryAndVerifySdkArgs>),
    ProducePlan(Box<ProducePlanArgs>),
}
