use super::uppercase_accessor::UppercaseAccessor;
use datafusion::config::ConfigOptions;
use proof_of_sql::{base::database::SchemaAccessor, sql::proof_plans::DynProofPlan};
use proof_of_sql_planner::{
    sql_to_proof_plans, statement_with_uppercase_identifiers, PlannerError,
};
use sqlparser::ast::Statement;

/// Retrieves a `DynProofPlan` given a query and the commitments for the relevant tables
pub fn get_plan_from_accessor_and_query(
    query: &Statement,
    accessor: impl SchemaAccessor + Clone,
) -> Result<DynProofPlan, PlannerError> {
    let accessor = &UppercaseAccessor(&accessor);
    let query = statement_with_uppercase_identifiers(query.clone());
    let mut config_options = ConfigOptions::default();
    config_options.sql_parser.enable_ident_normalization = false;
    sql_to_proof_plans(&[query], accessor, &config_options).map(|mut plans| {
        plans
            .pop()
            .expect("expected one proof plan for one statement")
    })
}

#[cfg(test)]
mod tests {
    use super::get_plan_from_accessor_and_query;
    use ark_std::test_rng;
    use bumpalo::Bump;
    use proof_of_sql::{
        base::database::{
            table_utility::{borrowed_decimal75, table},
            TableRef, TableTestAccessor,
        },
        proof_primitive::dory::{
            DoryScalar, DynamicDoryEvaluationProof, ProverSetup, PublicParameters,
        },
    };
    use sqlparser::{dialect::GenericDialect, parser::Parser};

    #[test]
    fn we_can_get_plan_from_accessor_and_query_even_when_query_uses_lowercase_idents() {
        let sql = r"SELECT a + b as res FROM tab;";
        let dialect = GenericDialect {};
        let query_parsed = Parser::parse_sql(&dialect, sql).unwrap()[0].clone();
        let table_ref = TableRef::from_names(None, "TAB");
        let alloc = Bump::new();
        let table = table::<DoryScalar>(vec![
            borrowed_decimal75("A", 5, 1, [1, 2, 3, 4], &alloc),
            borrowed_decimal75("B", 3, 2, [5, 6, 7, 8], &alloc),
        ]);
        let public_parameters = PublicParameters::test_rand(5, &mut test_rng());
        let prover_setup = ProverSetup::from(&public_parameters);
        let accessor = TableTestAccessor::<DynamicDoryEvaluationProof>::new_from_table(
            table_ref,
            table,
            0,
            &prover_setup,
        );
        get_plan_from_accessor_and_query(&query_parsed, accessor).unwrap();
    }
}
