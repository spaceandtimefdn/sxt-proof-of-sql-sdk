use super::{
    prover::{self, ProverContextRange, ProverQuery},
    uppercase_accessor::UppercaseAccessor,
    CommitmentEvaluationProofId,
};
use datafusion::config::ConfigOptions;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::{
    HyperKZGCommitment, HyperKZGCommitmentEvaluationProof,
};
use proof_of_sql::{
    base::{
        commitment::{CommitmentEvaluationProof, QueryCommitments},
        try_standard_binary_serialization,
    },
    proof_primitive::dory::{DynamicDoryCommitment, DynamicDoryEvaluationProof},
    sql::proof_plans::DynProofPlan,
};
use proof_of_sql_planner::{
    sql_to_proof_plans, statement_with_uppercase_identifiers, PlannerError,
};
use snafu::Snafu;
use sqlparser::{ast::Statement, parser::ParserError};

/// Proof-of-sql requires a default schema to be provided when creating a QueryExpr.
/// This is used as the schema when tables referenced in the query don't have one.
pub const DEFAULT_SCHEMA: &str = "PUBLIC";

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
pub fn plan_prover_query<CPI: CommitmentEvaluationProofId>(
    query: &Statement,
    commitments: &QueryCommitments<<CPI as CommitmentEvaluationProof>::Commitment>,
) -> Result<(ProverQuery, DynProofPlan), PlanProverQueryError> {
    let accessor = &UppercaseAccessor(commitments);
    let query = statement_with_uppercase_identifiers(query.clone());
    let mut config_options = ConfigOptions::default();
    config_options.sql_parser.enable_ident_normalization = false;
    let proof_plan = sql_to_proof_plans(&[query.clone()], accessor, &config_options)?[0].clone();
    let serialized_proof_plan =
        try_standard_binary_serialization(CPI::associated_proof_plan(&proof_plan))?;

    let query_context = commitments
        .iter()
        .map(|(table_ref, commitment)| {
            (
                table_ref.to_string().to_uppercase(),
                ProverContextRange {
                    start: commitment.range().start as u64,
                    ends: vec![commitment.range().end as u64],
                },
            )
        })
        .collect();

    Ok((
        ProverQuery {
            proof_plan: serialized_proof_plan,
            query_context,
            commitment_scheme: prover::CommitmentScheme::from(CPI::COMMITMENT_SCHEME).into(),
        },
        proof_plan,
    ))
}

/// Create a query for the prover service from sql query text and Dynamic Dory commitments.
pub fn plan_prover_query_dory(
    query: &Statement,
    commitments: &QueryCommitments<DynamicDoryCommitment>,
) -> Result<(ProverQuery, DynProofPlan), PlanProverQueryError> {
    plan_prover_query::<DynamicDoryEvaluationProof>(query, commitments)
}

/// Create a query for the prover service from sql query text and HyperKZG commitments.
#[cfg(feature = "hyperkzg")]
pub fn plan_prover_query_hyperkzg(
    query: &Statement,
    commitments: &QueryCommitments<HyperKZGCommitment>,
) -> Result<(ProverQuery, DynProofPlan), PlanProverQueryError> {
    plan_prover_query::<HyperKZGCommitmentEvaluationProof>(query, commitments)
}
