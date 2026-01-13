use crate::base::{CommitmentEvaluationProofId, UppercaseAccessor};
use datafusion::config::ConfigOptions;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::{
    HyperKZGCommitment, HyperKZGCommitmentEvaluationProof,
};
use proof_of_sql::{
    base::commitment::{CommitmentEvaluationProof, QueryCommitments},
    sql::proof_plans::DynProofPlan,
};
#[cfg(feature = "native")]
use proof_of_sql::proof_primitive::dory::{DynamicDoryCommitment, DynamicDoryEvaluationProof};
use proof_of_sql_planner::{
    sql_to_proof_plans, statement_with_uppercase_identifiers, PlannerError,
};
use snafu::Snafu;
use sqlparser::{ast::Statement, parser::ParserError};

/// Errors that can occur when planning a query to the prover.
#[derive(Snafu, Debug)]
pub enum PlanProverQueryError {
    /// Unable to parse sql.
    #[snafu(display("unable to parse sql: {source}"), context(false))]
    ParseIdentifier { source: ParserError },
    /// Unable to serialize proof plan.
    #[snafu(display("unable to serialize proof plan: {error}"))]
    ProofPlanSerialization { error: bincode::error::EncodeError },
    /// Planner was unable to generate proof plan
    #[snafu(display("unable to produce plan: {source}"), context(false))]
    ProofPlanGeneration { source: PlannerError },
}

impl From<bincode::error::EncodeError> for PlanProverQueryError {
    fn from(error: bincode::error::EncodeError) -> Self {
        PlanProverQueryError::ProofPlanSerialization { error }
    }
}

/// Create a query for the prover service from sql query text and commitments.
#[expect(dead_code)]
pub fn produce_plan_trustlessly<CPI: CommitmentEvaluationProofId>(
    query: &Statement,
    commitments: &QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment>,
) -> Result<DynProofPlan, PlanProverQueryError> {
    let accessor = &UppercaseAccessor(commitments);
    let query = statement_with_uppercase_identifiers(query.clone());
    let mut config_options = ConfigOptions::default();
    config_options.sql_parser.enable_ident_normalization = false;
    let proof_plan =
        sql_to_proof_plans(core::slice::from_ref(&query), accessor, &config_options)?[0].clone();
    Ok(proof_plan)
}

/// Create a query for the prover service from sql query text and Dynamic Dory commitments.
#[cfg_attr(not(test), expect(dead_code))]
#[cfg(feature = "native")]
pub fn produce_dory_plan_trustlessly(
    query: &Statement,
    commitments: &QueryCommitments<DynamicDoryCommitment>,
) -> Result<DynProofPlan, PlanProverQueryError> {
    produce_plan_trustlessly::<DynamicDoryEvaluationProof>(query, commitments)
}

/// Create a query for the prover service from sql query text and HyperKZG commitments.
#[expect(dead_code)]
#[cfg(feature = "hyperkzg")]
pub fn produce_hyperkzg_plan_trustlessly(
    query: &Statement,
    commitments: &QueryCommitments<HyperKZGCommitment>,
) -> Result<DynProofPlan, PlanProverQueryError> {
    produce_plan_trustlessly::<HyperKZGCommitmentEvaluationProof>(query, commitments)
}

#[cfg(feature = "native")]
#[cfg(test)]
mod tests {
    use crate::trustless_planning::prover_query::produce_dory_plan_trustlessly;
    use ark_std::test_rng;
    use bumpalo::Bump;
    use proof_of_sql::{
        base::{
            commitment::{QueryCommitments, QueryCommitmentsExt},
            database::{
                table_utility::{borrowed_decimal75, table},
                ColumnRef, ColumnType, TableRef, TableTestAccessor,
            },
            math::decimal::Precision,
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
            table_ref.clone(),
            table,
            0,
            &prover_setup,
        );
        let query_commitments = QueryCommitments::from_accessor_with_max_bounds(
            vec![
                ColumnRef::new(
                    table_ref.clone(),
                    "A".into(),
                    ColumnType::Decimal75(Precision::new(5).unwrap(), 1),
                ),
                ColumnRef::new(
                    table_ref.clone(),
                    "B".into(),
                    ColumnType::Decimal75(Precision::new(3).unwrap(), 2),
                ),
            ],
            &accessor,
        );
        produce_dory_plan_trustlessly(&query_parsed, &query_commitments).unwrap();
    }
}
