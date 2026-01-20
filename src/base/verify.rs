use super::{uppercase_accessor::UppercaseAccessor, CommitmentEvaluationProofId};
#[cfg(feature = "hyperkzg")]
use crate::base::commitment_scheme::HYPER_KZG_VERIFIER_SETUP_BYTES;
use crate::base::{
    attestation::{verify_attestations, AttestationsResponse},
    verifiable_commitment::extract_query_commitments_from_table_commitments_with_proof,
    zk_query_models::QueryResultsResponse,
};
use bnum::types::{I256, U256};
#[cfg(feature = "hyperkzg")]
use javy_plugin_api::javy::quickjs::{qjs::JSValue, Error};
#[cfg(feature = "hyperkzg")]
use nova_snark::provider::hyperkzg::VerifierKey;
#[cfg(feature = "hyperkzg")]
use proof_of_sql::{
    base::database::{ColumnType, OwnedColumn},
    proof_primitive::hyperkzg::{BNScalar, HyperKZGCommitmentEvaluationProof, HyperKZGEngine},
};
use proof_of_sql::{
    base::{
        commitment::CommitmentEvaluationProof,
        database::{CommitmentAccessor, LiteralValue, OwnedTable},
        posql_time::{PoSQLTimeUnit, PoSQLTimeZone},
        scalar::{Scalar, ScalarExt},
        try_standard_binary_deserialization,
    },
    sql::{
        evm_proof_plan::EVMProofPlan,
        proof::{QueryError, QueryProof},
    },
};
use serde::{Deserialize, Serialize};
use snafu::Snafu;
use std::ops::{Shl, Sub};

/// Errors that can occur when verifying a prover response.
#[derive(Snafu, Debug)]
pub enum VerifyProverResponseError {
    /// Unable to deserialize verifiable query result.
    #[snafu(display("unable to deserialize verifiable query result: {error}"))]
    VerifiableResultDeserialization { error: bincode::error::DecodeError },
    /// Failed to interpret or verify query results.
    #[snafu(
        display("failed to interpret or verify query results: {source}"),
        context(false)
    )]
    Verification { source: QueryError },
}

impl From<bincode::error::DecodeError> for VerifyProverResponseError {
    fn from(error: bincode::error::DecodeError) -> Self {
        VerifyProverResponseError::VerifiableResultDeserialization { error }
    }
}

/// Verify a response from the prover service (via the gateway) against the provided commitment accessor.
pub fn verify_prover_via_gateway_response<CPI: CommitmentEvaluationProofId>(
    proof: QueryProof<CPI>,
    result: OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>,
    proof_plan: &EVMProofPlan,
    params: &[LiteralValue],
    accessor: &impl CommitmentAccessor<<CPI as CommitmentEvaluationProof>::Commitment>,
    verifier_setup: &<CPI as CommitmentEvaluationProof>::VerifierPublicSetup<'_>,
) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, VerifyProverResponseError> {
    let accessor = UppercaseAccessor(accessor);

    // Verify the proof
    proof.verify(
        proof_plan,
        &accessor,
        result.clone(),
        verifier_setup,
        params,
    )?;
    Ok(result)
}

#[derive(Serialize)]
struct BooleanColumn {
    column: Vec<bool>,
}

#[derive(Serialize)]
struct TinyIntColumn {
    column: Vec<i8>,
}

#[derive(Serialize)]
struct SmallIntColumn {
    column: Vec<i16>,
}

#[derive(Serialize)]
struct IntColumn {
    column: Vec<i32>,
}

#[derive(Serialize)]
struct BigIntColumn {
    column: Vec<String>,
}

#[derive(Serialize)]
struct VarCharColumn {
    column: Vec<String>,
}

#[derive(Serialize)]
struct Decimal75Column {
    precision: u8,
    scale: i8,
    column: Vec<String>,
}

#[derive(Serialize)]
struct TimestampTZColumn {
    time_unit: PoSQLTimeUnit,
    offset: i32,
    column: Vec<String>,
}

#[derive(Serialize)]
struct VarBinaryColumn {
    column: Vec<Vec<u8>>,
}

#[derive(Serialize)]
struct ScalarColumn {
    column: Vec<String>,
}

#[cfg(feature = "hyperkzg")]
#[derive(Serialize)]
#[serde(tag = "type")]
enum JSFriendlyColumn {
    /// Boolean columns
    Boolean(BooleanColumn),
    /// i8 columns
    TinyInt(TinyIntColumn),
    /// i16 columns
    SmallInt(SmallIntColumn),
    /// i32 columns
    Int(IntColumn),
    /// i64 columns
    BigInt(BigIntColumn),
    /// String columns
    VarChar(VarCharColumn),
    /// Decimal columns
    Decimal75(Decimal75Column),
    /// Timestamp columns
    TimestampTZ(TimestampTZColumn),
    /// Variable length binary columns
    VarBinary(VarBinaryColumn),
    Scalar(ScalarColumn),
}

fn scalar_to_string(scalar: &Vec<BNScalar>) -> Vec<String> {
    scalar
        .iter()
        .map(|s| match s.gt(&BNScalar::MAX_SIGNED) {
            true => {
                let abs_value = BNScalar::ZERO.sub(*s);
                format!("-{}", abs_value.into_u256_wrapping().to_string())
            }
            false => s.into_u256_wrapping().to_string(),
        })
        .collect()
}

#[cfg(feature = "hyperkzg")]
pub fn proof_of_sql_verify_from_json_responses(
    query_results_json: String,
    attestations_json: String,
) -> Result<String, Error> {
    use indexmap::IndexMap;

    let query_results: QueryResultsResponse = serde_json::from_str(&query_results_json)
        .map_err(|err| err.to_string())
        .unwrap();
    let attestations_response: AttestationsResponse = serde_json::from_str(&attestations_json)
        .map_err(|err| err.to_string())
        .unwrap();
    let verifier_setup: VerifierKey<HyperKZGEngine> =
        try_standard_binary_deserialization(HYPER_KZG_VERIFIER_SETUP_BYTES)
            .map_err(|err| err.to_string())
            .unwrap()
            .0;

    let result =
        &verify_from_zk_query_and_substrate_responses::<HyperKZGCommitmentEvaluationProof>(
            query_results,
            attestations_response,
            &&verifier_setup,
        )
        .map_err(|err| err.to_string())
        .unwrap();

    let mapping = result
        .inner_table()
        .iter()
        .map(|(ident, column)| {
            (
                ident.to_string(),
                match column {
                    OwnedColumn::Boolean(items) => JSFriendlyColumn::Boolean(BooleanColumn {
                        column: items.clone(),
                    }),
                    OwnedColumn::TinyInt(items) => JSFriendlyColumn::TinyInt(TinyIntColumn {
                        column: items.clone(),
                    }),
                    OwnedColumn::SmallInt(items) => JSFriendlyColumn::SmallInt(SmallIntColumn {
                        column: items.clone(),
                    }),
                    OwnedColumn::Int(items) => JSFriendlyColumn::Int(IntColumn {
                        column: items.clone(),
                    }),
                    OwnedColumn::BigInt(items) => JSFriendlyColumn::BigInt(BigIntColumn {
                        column: items
                            .iter()
                            .map(|item| item.to_string())
                            .collect::<Vec<_>>(),
                    }),
                    OwnedColumn::VarChar(items) => JSFriendlyColumn::VarChar(VarCharColumn {
                        column: items.clone(),
                    }),
                    OwnedColumn::Decimal75(precision, scale, items) => {
                        JSFriendlyColumn::Decimal75(Decimal75Column {
                            precision: precision.value(),
                            scale: *scale,
                            column: scalar_to_string(items),
                        })
                    }
                    OwnedColumn::TimestampTZ(time_unit, time_zone, items) => {
                        JSFriendlyColumn::TimestampTZ(TimestampTZColumn {
                            time_unit: *time_unit,
                            offset: time_zone.offset(),
                            column: items
                                .iter()
                                .map(|item| item.to_string())
                                .collect::<Vec<_>>(),
                        })
                    }
                    OwnedColumn::VarBinary(items) => JSFriendlyColumn::VarBinary(VarBinaryColumn {
                        column: items.clone(),
                    }),
                    OwnedColumn::Scalar(items) => JSFriendlyColumn::Scalar(ScalarColumn {
                        column: scalar_to_string(items),
                    }),
                    _ => unimplemented!(),
                },
            )
        })
        .collect::<IndexMap<_, _>>();

    Ok(serde_json::to_string(&mapping).unwrap())
}

pub fn verify_from_zk_query_and_substrate_responses<CPI: CommitmentEvaluationProofId>(
    query_results: QueryResultsResponse,
    attestations_response: AttestationsResponse,
    verifier_setup: &<CPI as CommitmentEvaluationProof>::VerifierPublicSetup<'_>,
) -> Result<OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar>, Box<dyn core::error::Error>> {
    let table_commitment_with_proof = query_results.commitments.commitments;
    let attestations = attestations_response.attestations;
    verify_attestations(
        &attestations,
        &table_commitment_with_proof,
        CPI::COMMITMENT_SCHEME,
    )
    .map_err(|err| err.to_string())?;

    let query_commitments = extract_query_commitments_from_table_commitments_with_proof::<CPI>(
        table_commitment_with_proof,
    )?;
    let uppercased_query_commitments = UppercaseAccessor(&query_commitments);
    let plan: EVMProofPlan = try_standard_binary_deserialization(&query_results.plan)?.0;
    let proof: QueryProof<CPI> = try_standard_binary_deserialization(&query_results.proof)?.0;
    let result: OwnedTable<<CPI as CommitmentEvaluationProof>::Scalar> =
        try_standard_binary_deserialization(&query_results.results)?.0;

    Ok(verify_prover_via_gateway_response::<CPI>(
        proof,
        result,
        &plan,
        &[],
        &uppercased_query_commitments,
        verifier_setup,
    )
    .map_err(|err| err.to_string())?)
}

#[cfg(test)]
mod tests {
    use crate::base::verify::scalar_to_string;
    use proof_of_sql::{
        base::{database::OwnedColumn, scalar::Scalar},
        proof_primitive::hyperkzg::BNScalar,
    };
    use std::ops::Add;

    #[test]
    fn test_owned_column() {
        let owned_bigint_column: OwnedColumn<BNScalar> =
            proof_of_sql::base::database::OwnedColumn::BigInt(vec![1, 2, 3]);
        let test = vec![("test".to_string(), owned_bigint_column.clone())]
            .into_iter()
            .collect::<indexmap::IndexMap<_, _>>();
        let serialized = serde_json::to_string(&test).unwrap();
        dbg!(&serialized);
    }

    #[test]
    fn test_scalar_to_string() {
        let scalars = vec![
            BNScalar::from(-1),
            BNScalar::from(2),
            BNScalar::from(3),
            BNScalar::from(0),
            BNScalar::MAX_SIGNED,
            BNScalar::MAX_SIGNED.add(BNScalar::ONE),
        ];
        let result = scalar_to_string(&scalars);
        assert_eq!(
            result,
            vec![
                "-1",
                "2",
                "3",
                "0",
                "10944121435919637611123202872628637544274182200208017171849102093287904247808",
                "-10944121435919637611123202872628637544274182200208017171849102093287904247808"
            ]
        );
    }
}
