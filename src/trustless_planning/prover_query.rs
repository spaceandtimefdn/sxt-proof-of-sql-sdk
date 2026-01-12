use crate::base::{CommitmentEvaluationProofId, UppercaseAccessor};
use datafusion::config::ConfigOptions;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::{
    HyperKZGCommitment, HyperKZGCommitmentEvaluationProof,
};
use proof_of_sql::{
    base::commitment::{CommitmentEvaluationProof, QueryCommitments},
    proof_primitive::dory::{DynamicDoryCommitment, DynamicDoryEvaluationProof},
    sql::proof_plans::DynProofPlan,
};
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
#[expect(dead_code)]
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
