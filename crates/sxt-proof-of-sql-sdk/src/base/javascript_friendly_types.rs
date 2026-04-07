use indexmap::IndexMap;
use proof_of_sql::{
    base::{
        database::{OwnedColumn, OwnedTable},
        posql_time::PoSQLTimeUnit,
        scalar::{Scalar, ScalarExt},
    },
    proof_primitive::hyperkzg::BNScalar,
};
use serde::{Deserialize, Serialize};
use std::ops::Neg;

#[derive(Serialize, Debug, PartialEq, Deserialize)]
pub(crate) struct Decimal75Column {
    precision: u8,
    scale: i8,
    column: Vec<String>,
}

#[derive(Serialize, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TimestampTZColumn {
    time_unit: PoSQLTimeUnit,
    offset: i32,
    column: Vec<String>,
}

#[derive(Serialize, Debug, PartialEq, Deserialize)]
pub(crate) struct Column<T> {
    pub(crate) column: Vec<T>,
}

/// A JavaScript-friendly representation of a proof of sql result column, converting larger integer types to strings.
#[derive(Serialize, Debug, PartialEq, Deserialize)]
#[serde(tag = "type")]
pub(crate) enum JSFriendlyColumn {
    /// Boolean columns
    Boolean(Column<bool>),
    /// i8 columns
    TinyInt(Column<i8>),
    /// i16 columns
    SmallInt(Column<i16>),
    /// i32 columns
    Int(Column<i32>),
    /// i64 columns
    BigInt(Column<String>),
    /// String columns
    VarChar(Column<String>),
    /// Decimal columns
    Decimal75(Decimal75Column),
    /// Timestamp columns
    TimestampTZ(TimestampTZColumn),
    /// Variable length binary columns
    VarBinary(Column<Vec<u8>>),
    /// Scalar columns
    Scalar(Column<String>),
}

#[derive(Serialize, Debug, Deserialize, PartialEq)]
pub(crate) struct Success<T> {
    result: T,
}

#[derive(Serialize, Debug, Deserialize, PartialEq)]
#[serde(tag = "error", content = "message")]
pub(crate) enum Failure {
    QueryResultsDeserialization(String),
    AttestorDeserialization(String),
    VerificationError(String),
    TypeConversion(String),
    Serialization(String),
}

#[derive(Serialize, Debug, Deserialize, PartialEq)]
#[serde(tag = "verificationStatus")]
pub(crate) enum VerificationStatus<T> {
    Success(Success<T>),
    Failure(Failure),
}

impl<T> From<Failure> for VerificationStatus<T> {
    fn from(value: Failure) -> Self {
        VerificationStatus::Failure(value)
    }
}

// Converts a `BNScalar` slice to a vector of decimal strings, handling negative values appropriately.
fn scalar_to_string(scalar: Vec<BNScalar>) -> Vec<String> {
    scalar
        .iter()
        .map(|s| match s.gt(&BNScalar::MAX_SIGNED) {
            true => {
                let abs_value = s.neg();
                format!("-{}", abs_value.into_u256_wrapping())
            }
            false => s.into_u256_wrapping().to_string(),
        })
        .collect()
}

impl TryFrom<OwnedColumn<BNScalar>> for JSFriendlyColumn {
    type Error = Failure;

    fn try_from(value: OwnedColumn<BNScalar>) -> Result<Self, Self::Error> {
        match value {
            OwnedColumn::Boolean(items) => Ok(JSFriendlyColumn::Boolean(Column { column: items })),
            OwnedColumn::TinyInt(items) => Ok(JSFriendlyColumn::TinyInt(Column { column: items })),
            OwnedColumn::SmallInt(items) => {
                Ok(JSFriendlyColumn::SmallInt(Column { column: items }))
            }
            OwnedColumn::Int(items) => Ok(JSFriendlyColumn::Int(Column { column: items })),
            OwnedColumn::BigInt(items) => Ok(JSFriendlyColumn::BigInt(Column {
                column: items
                    .iter()
                    .map(|item| item.to_string())
                    .collect::<Vec<_>>(),
            })),
            OwnedColumn::VarChar(items) => Ok(JSFriendlyColumn::VarChar(Column { column: items })),
            OwnedColumn::Decimal75(precision, scale, items) => {
                Ok(JSFriendlyColumn::Decimal75(Decimal75Column {
                    precision: precision.value(),
                    scale,
                    column: scalar_to_string(items),
                }))
            }
            OwnedColumn::TimestampTZ(time_unit, time_zone, items) => {
                Ok(JSFriendlyColumn::TimestampTZ(TimestampTZColumn {
                    time_unit,
                    offset: time_zone.offset(),
                    column: items
                        .iter()
                        .map(|item| item.to_string())
                        .collect::<Vec<_>>(),
                }))
            }
            OwnedColumn::VarBinary(items) => {
                Ok(JSFriendlyColumn::VarBinary(Column { column: items }))
            }
            OwnedColumn::Scalar(items) => Ok(JSFriendlyColumn::Scalar(Column {
                column: scalar_to_string(items),
            })),
            _ => Err(Failure::TypeConversion(format!(
                "Unsupported column type: {}",
                value.column_type()
            ))),
        }
    }
}

/// Convert a result table to a javascript friendly value. This handles converting bigger integer types to string for easier handling by javascript.
pub(crate) fn try_convert_table_to_javascript_friendly_table(
    table: OwnedTable<BNScalar>,
) -> Result<IndexMap<String, JSFriendlyColumn>, Failure> {
    table
        .into_inner()
        .into_iter()
        .map(|(key, column)| {
            let js_friendly_column = JSFriendlyColumn::try_from(column)?;
            Ok((key.to_string(), js_friendly_column))
        })
        .collect()
}

impl From<Result<IndexMap<String, JSFriendlyColumn>, Failure>>
    for VerificationStatus<IndexMap<String, JSFriendlyColumn>>
{
    fn from(value: Result<IndexMap<String, JSFriendlyColumn>, Failure>) -> Self {
        value.map_or_else(VerificationStatus::Failure, |success| {
            VerificationStatus::Success(Success { result: success })
        })
    }
}

#[cfg(test)]
mod tests {
    use crate::base::javascript_friendly_types::{
        try_convert_table_to_javascript_friendly_table, Column, Decimal75Column, Failure,
        JSFriendlyColumn, Success, TimestampTZColumn, VerificationStatus,
    };
    use indexmap::IndexMap;
    use proof_of_sql::{
        base::{
            database::{OwnedColumn, OwnedTable},
            math::decimal::Precision,
            posql_time::{PoSQLTimeUnit, PoSQLTimeZone},
        },
        proof_primitive::hyperkzg::BNScalar,
    };
    use sqlparser::ast::Ident;

    const JAVASCRIPT_FRIENDLY_SUCCESS: &str =
        include_str!("../../../../test_assets/javascript_friendly_success.json");
    const JAVASCRIPT_FRIENDLY_FAILURES: &str =
        include_str!("../../../../test_assets/javascript_friendly_failures.json");

    #[test]
    fn test_js_friendly_boolean_column_conversion() {
        let boolean_column = OwnedColumn::Boolean(vec![true, false, true]);
        let js_friendly_column =
            JSFriendlyColumn::try_from(boolean_column).expect("Conversion failed");
        if let JSFriendlyColumn::Boolean(bool_col) = js_friendly_column {
            assert_eq!(bool_col.column, vec![true, false, true]);
        } else {
            panic!("Expected Boolean column");
        }
    }

    #[test]
    fn test_js_friendly_tinyint_column_conversion() {
        let tinyint_column = OwnedColumn::TinyInt(vec![1, -2, 3]);
        let js_friendly_column =
            JSFriendlyColumn::try_from(tinyint_column).expect("Conversion failed");
        if let JSFriendlyColumn::TinyInt(tinyint_col) = js_friendly_column {
            assert_eq!(tinyint_col.column, vec![1, -2, 3]);
        } else {
            panic!("Expected TinyInt column");
        }
    }

    #[test]
    fn test_js_friendly_smallint_column_conversion() {
        let smallint_column = OwnedColumn::SmallInt(vec![1, -2, 3]);
        let js_friendly_column =
            JSFriendlyColumn::try_from(smallint_column).expect("Conversion failed");
        if let JSFriendlyColumn::SmallInt(smallint_col) = js_friendly_column {
            assert_eq!(smallint_col.column, vec![1, -2, 3]);
        } else {
            panic!("Expected SmallInt column");
        }
    }

    #[test]
    fn test_js_friendly_int_column_conversion() {
        let int_column = OwnedColumn::Int(vec![1, -2, 3]);
        let js_friendly_column = JSFriendlyColumn::try_from(int_column).expect("Conversion failed");
        if let JSFriendlyColumn::Int(int_col) = js_friendly_column {
            assert_eq!(int_col.column, vec![1, -2, 3]);
        } else {
            panic!("Expected Int column");
        }
    }

    #[test]
    fn test_js_friendly_bigint_column_conversion() {
        let bigint_column = OwnedColumn::BigInt(vec![1234567890123456789, -987654321098765432]);
        let js_friendly_column =
            JSFriendlyColumn::try_from(bigint_column).expect("Conversion failed");
        if let JSFriendlyColumn::BigInt(bigint_col) = js_friendly_column {
            assert_eq!(
                bigint_col.column,
                vec![
                    "1234567890123456789".to_string(),
                    "-987654321098765432".to_string()
                ]
            );
        } else {
            panic!("Expected BigInt column");
        }
    }

    #[test]
    fn test_js_friendly_varchar_column_conversion() {
        let varchar_column = OwnedColumn::VarChar(vec!["hello".to_string(), "world".to_string()]);
        let js_friendly_column =
            JSFriendlyColumn::try_from(varchar_column).expect("Conversion failed");
        if let JSFriendlyColumn::VarChar(varchar_col) = js_friendly_column {
            assert_eq!(
                varchar_col.column,
                vec!["hello".to_string(), "world".to_string()]
            );
        } else {
            panic!("Expected VarChar column");
        }
    }

    #[test]
    fn test_js_friendly_decimal75_column_conversion() {
        let decimal_column = OwnedColumn::Decimal75(
            Precision::new(5).unwrap(),
            -2i8,
            vec![BNScalar::from(12345), BNScalar::from(-67890)],
        );
        let js_friendly_column = JSFriendlyColumn::try_from(decimal_column).unwrap();
        if let JSFriendlyColumn::Decimal75(decimal_col) = js_friendly_column {
            assert_eq!(
                decimal_col.column,
                vec!["12345".to_string(), "-67890".to_string()]
            );
        } else {
            panic!("Expected Decimal75 column");
        }
    }

    #[test]
    fn test_js_friendly_timestamp_tz_column_conversion() {
        let timestamp_column = OwnedColumn::TimestampTZ(
            PoSQLTimeUnit::Millisecond,
            PoSQLTimeZone::utc(),
            vec![1234567890, -9876543210],
        );
        let js_friendly_column = JSFriendlyColumn::try_from(timestamp_column).unwrap();
        if let JSFriendlyColumn::TimestampTZ(timestamp_col) = js_friendly_column {
            assert_eq!(
                timestamp_col.column,
                vec!["1234567890".to_string(), "-9876543210".to_string()]
            );
        } else {
            panic!("Expected TimestampTZ column");
        }
    }

    #[test]
    fn test_js_friendly_varbinary_column_conversion() {
        let varbinary_column = OwnedColumn::VarBinary(vec![vec![1, 2, 3], vec![4, 5, 6]]);
        let js_friendly_column =
            JSFriendlyColumn::try_from(varbinary_column).expect("Conversion failed");
        if let JSFriendlyColumn::VarBinary(varbinary_col) = js_friendly_column {
            assert_eq!(varbinary_col.column, vec![vec![1, 2, 3], vec![4, 5, 6]]);
        } else {
            panic!("Expected VarBinary column");
        }
    }

    #[test]
    fn test_js_friendly_scalar_column_conversion() {
        let scalar_column = OwnedColumn::Scalar(vec![BNScalar::from(42), BNScalar::from(-99)]);
        let js_friendly_column = JSFriendlyColumn::try_from(scalar_column).unwrap();
        if let JSFriendlyColumn::Scalar(scalar_col) = js_friendly_column {
            assert_eq!(scalar_col.column, vec!["42".to_string(), "-99".to_string()]);
        } else {
            panic!("Expected Scalar column");
        }
    }

    #[test]
    fn test_js_friendly_unsupported_column_conversion() {
        let unsupported_column = OwnedColumn::Uint8(vec![1u8, 2u8, 3u8]);
        let result = JSFriendlyColumn::try_from(unsupported_column).unwrap_err();
        assert!(
            matches!(result, Failure::TypeConversion(err) if err == "Unsupported column type: UINT8")
        );
    }

    #[test]
    fn test_convert_result_to_json() {
        let mut result = IndexMap::new();
        let bool_column = OwnedColumn::Boolean(vec![true, false, true]);
        result.insert(Ident::new("bool_col"), bool_column.clone());
        let int_column = OwnedColumn::Int(vec![1, -2, 3]);
        result.insert(Ident::new("int_col"), int_column.clone());
        let big_int_column = OwnedColumn::BigInt(vec![1234567890123456789, -987654321098765432, 2]);
        result.insert(Ident::new("bigint_col"), big_int_column.clone());

        let result = try_convert_table_to_javascript_friendly_table(
            OwnedTable::try_new(result.into_iter().collect()).unwrap(),
        )
        .unwrap();
        let expected_result = indexmap::indexmap! {
            "bool_col".to_string() => JSFriendlyColumn::try_from(bool_column).unwrap(),
            "int_col".to_string() => JSFriendlyColumn::try_from(int_column).unwrap(),
            "bigint_col".to_string() => JSFriendlyColumn::try_from(big_int_column).unwrap()
        };
        assert_eq!(result, expected_result);
    }

    #[test]
    fn test_convert_result_to_json_with_unsupported_column() {
        let mut result = IndexMap::new();
        let col = OwnedColumn::Uint8(vec![1u8, 2u8, 3u8]);
        result.insert(Ident::new("unsupported_col"), col.clone());
        let failure = try_convert_table_to_javascript_friendly_table(
            OwnedTable::try_new(result.into_iter().collect()).unwrap(),
        )
        .unwrap_err();
        assert!(
            matches!(failure, Failure::TypeConversion(message) if message == "Unsupported column type: UINT8")
        );
    }

    #[test]
    fn serilization_works_as_expected() {
        let res = VerificationStatus::Success(Success {
            result: indexmap::indexmap! {
                "BOOLEAN_COLUMN".to_string() => JSFriendlyColumn::Boolean(Column{column: vec![false]}),
                "TINYINT_COLUMN".to_string() => JSFriendlyColumn::TinyInt(Column{column: vec![1]}),
                "SMALLINT_COLUMN".to_string() => JSFriendlyColumn::SmallInt(Column{column: vec![100]}),
                "INT_COLUMN".to_string() => JSFriendlyColumn::Int(Column{column: vec![22432845]}),
                "BIGINT_COLUMN".to_string() => JSFriendlyColumn::BigInt(Column{column: vec!["22432845".to_string()]}),
                "VARCHAR_COLUMN".to_string() => JSFriendlyColumn::VarChar(Column{column: vec!["test".to_string()]}),
                "DECIMAL75_COLUMN".to_string() => JSFriendlyColumn::Decimal75(Decimal75Column{ precision: 4, scale: 1, column: vec!["22432845".to_string()] }),
                "TIMESTAMPTZ_COLUMN".to_string() => JSFriendlyColumn::TimestampTZ(TimestampTZColumn{time_unit: PoSQLTimeUnit::Millisecond, offset: 0, column: vec!["22432845".to_string()]}),
                "VARBINARY_COLUMN".to_string() => JSFriendlyColumn::VarBinary(Column{column: vec![vec![1,2,3,4,5]]}),
                "SCALAR_COLUMN".to_string() => JSFriendlyColumn::Scalar(Column{column: vec!["22432845".to_string()]}),
            },
        });
        let serialized = serde_json::to_string(&res).unwrap();
        let expected_result: VerificationStatus<IndexMap<String, JSFriendlyColumn>> =
            serde_json::from_str(&serialized).unwrap();
        assert_eq!(res, expected_result);
        // We'll include this check just to verify the serialization format is compatible with the zod types.
        let expected_result: VerificationStatus<IndexMap<String, JSFriendlyColumn>> =
            serde_json::from_str(JAVASCRIPT_FRIENDLY_SUCCESS).unwrap();
        assert_eq!(res, expected_result);
    }

    #[test]
    fn serilization_works_as_expected_when_failures() {
        let res: Vec<VerificationStatus<IndexMap<String, JSFriendlyColumn>>> = vec![
            Failure::QueryResultsDeserialization("Failed to deserialize query results".to_string())
                .into(),
            Failure::AttestorDeserialization(
                "Failed to deserialize attestor information".to_string(),
            )
            .into(),
            Failure::VerificationError("Proof verification failed".to_string()).into(),
            Failure::TypeConversion(
                "Failed to convert result to JavaScript-friendly format".to_string(),
            )
            .into(),
            Failure::Serialization("Failed to serialize result".to_string()).into(),
        ];
        let serialized = serde_json::to_string(&res).unwrap();
        let expected_result: Vec<VerificationStatus<IndexMap<String, JSFriendlyColumn>>> =
            serde_json::from_str(&serialized).unwrap();
        assert_eq!(res, expected_result);
        // We'll include this check just to verify the serialization format is compatible with the zod types.
        let expected_result: Vec<VerificationStatus<IndexMap<String, JSFriendlyColumn>>> =
            serde_json::from_str(JAVASCRIPT_FRIENDLY_FAILURES).unwrap();
        assert_eq!(res, expected_result);
    }
}
