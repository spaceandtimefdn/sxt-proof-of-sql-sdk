use crate::{query_commitments, substrate::SxtConfig};
use proof_of_sql::sql::proof_plans::DynProofPlan;
use proof_of_sql_planner::get_table_refs_from_statement;
use sqlparser::{dialect::GenericDialect, parser::Parser};
use subxt::Config;
use sxt_proof_of_sql_sdk_local::{get_plan_from_accessor_and_query, uppercase_table_ref};

/// Produces a plan given the substrate url and the query
pub async fn produce_plan(
    substrate_node_url: String,
    query: &str,
    block_ref: Option<<SxtConfig as Config>::Hash>,
) -> Result<DynProofPlan, Box<dyn core::error::Error>> {
    let dialect = GenericDialect {};
    let query_parsed = Parser::parse_sql(&dialect, query)?[0].clone();
    let table_refs = get_table_refs_from_statement(&query_parsed)?
        .into_iter()
        .map(uppercase_table_ref)
        .collect::<Vec<_>>();
    let accessor = query_commitments(&table_refs, &substrate_node_url, block_ref).await?;
    Ok(get_plan_from_accessor_and_query(&query_parsed, accessor)?)
}
