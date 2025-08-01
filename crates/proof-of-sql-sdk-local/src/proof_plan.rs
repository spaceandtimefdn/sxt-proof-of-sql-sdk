use crate::uppercase_accessor::UppercaseAccessor;
use datafusion::config::ConfigOptions;
use proof_of_sql::{base::database::SchemaAccessor, sql::proof_plans::DynProofPlan};
use proof_of_sql_planner::{
    sql_to_proof_plans, statement_with_uppercase_identifiers, PlannerError,
};
use sqlparser::ast::Statement;

pub fn get_plan_from_accessor_and_query(
    query: &Statement,
    accessor: impl SchemaAccessor + Clone,
) -> Result<DynProofPlan, PlannerError> {
    let accessor = &UppercaseAccessor(&accessor);
    let query = statement_with_uppercase_identifiers(query.clone());
    let mut config_options = ConfigOptions::default();
    config_options.sql_parser.enable_ident_normalization = false;
    sql_to_proof_plans(&[query], accessor, &config_options).map(|plans| plans[0].clone())
}
