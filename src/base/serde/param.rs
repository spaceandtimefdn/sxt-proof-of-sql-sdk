//! Deserialize query parameters

use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use proof_of_sql::base::{
    database::LiteralValue,
    math::{decimal::Precision, i256::I256, BigDecimalExt},
    posql_time::{PoSQLTimeUnit, PoSQLTimeZone},
};
use snafu::Snafu;
use std::str::FromStr;

/// Errors that can occur when parsing a string into a LiteralValue
#[derive(Debug, Snafu)]
pub enum ParamParseError {
    #[snafu(display("VARCHAR must be quoted with single or double quotes"))]
    UnquotedVarchar,

    #[snafu(display("Non-VARCHAR types must not be quoted"))]
    QuotedNonVarchar,

    #[snafu(display("Invalid boolean value: {value}"))]
    InvalidBoolean { value: String },

    #[snafu(display("Invalid integer value: {value}"))]
    InvalidInteger { value: String },

    #[snafu(display("Invalid decimal value: {value}"))]
    InvalidDecimal { value: String },

    #[snafu(display(
        "Decimal requires exactly {expected} digits after decimal point, found {actual}"
    ))]
    InvalidDecimalPrecision { expected: i8, actual: usize },

    #[snafu(display("Invalid hexadecimal value: {value}"))]
    InvalidHex { value: String },

    #[snafu(display("Invalid timestamp value: {value}"))]
    InvalidTimestamp { value: String },

    #[snafu(display("Timestamp precision finer than milliseconds is not supported"))]
    TimestampTooFinePrecision,

    #[snafu(display("Invalid precision value: {value}"))]
    InvalidPrecision { value: u8 },

    #[snafu(display("Missing type suffix for SmallInt (expected _i16)"))]
    MissingSmallIntSuffix,

    #[snafu(display("Missing type suffix for Int (expected _i32)"))]
    MissingIntSuffix,

    #[snafu(display("Missing type suffix for TinyInt (expected _i8)"))]
    MissingTinyIntSuffix,

    #[snafu(display("Invalid escape sequence in string"))]
    InvalidEscapeSequence,

    #[snafu(display("Unescaped quote character in string"))]
    UnescapedQuoteInString,

    #[snafu(display("Unterminated quoted string"))]
    UnterminatedString,
}

/// Parse a string into a LiteralValue according to the type rules:
/// - VarChars must be single or double quoted
/// - All other types must not be quoted
/// - Backslash (\) is used for escaping
/// - Binaries must be in hex (case insensitive)
/// - Decimals are parsed with automatic precision/scale detection for Decimal(m, n)
/// - Integers are by default BigInts (i64)
/// - Other integer types must have _i8, _i16, _i32, or _i64 suffix (note: _i64 is optional since i64 is the default)
/// - Booleans can be t, f, true, false (case insensitive)
/// - Timestamps are parsed and converted to UTC milliseconds
pub fn parse_literal_value(input: &str) -> Result<LiteralValue, ParamParseError> {
    let trimmed = input.trim();

    // Check if the value is quoted (VARCHAR) with matching quotes
    if trimmed.len() >= 2 {
        let first = trimmed.chars().next().expect("Checked length above");
        let last = trimmed.chars().next_back().expect("Checked length above");
        if (first == last) && (first == '"' || first == '\'') {
            return parse_varchar(trimmed);
        }
    }

    // Check for integer type suffixes
    if let Some(num) = trimmed.strip_suffix("_i8") {
        return parse_tinyint(num);
    }
    if let Some(num) = trimmed.strip_suffix("_i16") {
        return parse_smallint(num);
    }
    if let Some(num) = trimmed.strip_suffix("_i32") {
        return parse_int(num);
    }
    if let Some(num) = trimmed.strip_suffix("_i64") {
        return parse_bigint(num);
    }

    // Try to parse as boolean
    if let Ok(bool_val) = parse_boolean(trimmed) {
        return Ok(bool_val);
    }

    // Try to parse as decimal (contains a dot)
    if trimmed.contains('.') {
        return parse_decimal75(trimmed);
    }

    // Try to parse as hex (0x prefix)
    if trimmed.starts_with("0x") || trimmed.starts_with("0X") {
        return parse_varbinary(trimmed);
    }

    // Try to parse as BigInt (default integer type)
    // We need to check if it's a valid integer format before trying timestamp
    if trimmed
        .chars()
        .all(|c| c.is_ascii_digit() || c == '-' || c == '+')
    {
        return parse_bigint(trimmed);
    }

    // Try to parse as timestamp
    parse_timestamp(trimmed)
}

fn parse_varchar(quoted: &str) -> Result<LiteralValue, ParamParseError> {
    // Ensure the quoted string is at least two characters long
    if quoted.len() < 2 {
        return Err(ParamParseError::UnquotedVarchar);
    }
    let quote_char = quoted.chars().next().expect("Checked length above");
    let content = &quoted[1..quoted.len() - 1];

    let mut result = String::new();
    let mut chars = content.chars();

    while let Some(ch) = chars.next() {
        if ch == '\\' {
            // Handle escape sequences
            if let Some(next) = chars.next() {
                match next {
                    '\\' => result.push('\\'),
                    '"' => result.push('"'),
                    '\'' => result.push('\''),
                    'n' => result.push('\n'),
                    'r' => result.push('\r'),
                    't' => result.push('\t'),
                    _ => return Err(ParamParseError::InvalidEscapeSequence),
                }
            } else {
                return Err(ParamParseError::InvalidEscapeSequence);
            }
        } else if ch == quote_char {
            return Err(ParamParseError::UnescapedQuoteInString);
        } else {
            result.push(ch);
        }
    }

    Ok(LiteralValue::VarChar(result))
}

fn parse_boolean(input: &str) -> Result<LiteralValue, ParamParseError> {
    match input.to_lowercase().as_str() {
        "t" | "true" => Ok(LiteralValue::Boolean(true)),
        "f" | "false" => Ok(LiteralValue::Boolean(false)),
        _ => Err(ParamParseError::InvalidBoolean {
            value: input.to_string(),
        }),
    }
}

fn parse_tinyint(input: &str) -> Result<LiteralValue, ParamParseError> {
    input
        .trim()
        .parse::<i8>()
        .map(LiteralValue::TinyInt)
        .map_err(|_| ParamParseError::InvalidInteger {
            value: input.to_string(),
        })
}

fn parse_smallint(input: &str) -> Result<LiteralValue, ParamParseError> {
    input
        .trim()
        .parse::<i16>()
        .map(LiteralValue::SmallInt)
        .map_err(|_| ParamParseError::InvalidInteger {
            value: input.to_string(),
        })
}

fn parse_int(input: &str) -> Result<LiteralValue, ParamParseError> {
    input
        .trim()
        .parse::<i32>()
        .map(LiteralValue::Int)
        .map_err(|_| ParamParseError::InvalidInteger {
            value: input.to_string(),
        })
}

fn parse_bigint(input: &str) -> Result<LiteralValue, ParamParseError> {
    input
        .trim()
        .parse::<i64>()
        .map(LiteralValue::BigInt)
        .map_err(|_| ParamParseError::InvalidInteger {
            value: input.to_string(),
        })
}

fn parse_decimal75(input: &str) -> Result<LiteralValue, ParamParseError> {
    // Parse as BigDecimal
    let big_decimal = BigDecimal::from_str(input).map_err(|_| ParamParseError::InvalidDecimal {
        value: input.to_string(),
    })?;

    // Get precision and scale using BigDecimalExt
    let precision_u8 =
        big_decimal
            .precision()
            .try_into()
            .map_err(|_| ParamParseError::InvalidDecimal {
                value: input.to_string(),
            })?;

    let precision_obj =
        Precision::new(precision_u8).map_err(|_| ParamParseError::InvalidPrecision {
            value: precision_u8,
        })?;

    let scale_i64 = big_decimal.scale();
    let scale = scale_i64
        .try_into()
        .map_err(|_| ParamParseError::InvalidDecimal {
            value: input.to_string(),
        })?;

    // Convert BigDecimal to I256 using from_num_bigint
    let (bigint, _) = big_decimal.into_bigint_and_exponent();
    let i256_value = I256::from_num_bigint(&bigint);

    Ok(LiteralValue::Decimal75(precision_obj, scale, i256_value))
}

fn parse_varbinary(input: &str) -> Result<LiteralValue, ParamParseError> {
    let hex_str = input.trim_start_matches("0x").trim_start_matches("0X");

    hex::decode(hex_str)
        .map(LiteralValue::VarBinary)
        .map_err(|_| ParamParseError::InvalidHex {
            value: input.to_string(),
        })
}

fn parse_timestamp(input: &str) -> Result<LiteralValue, ParamParseError> {
    // Try to parse as RFC3339/ISO8601 timestamp
    let dt =
        DateTime::parse_from_rfc3339(input).map_err(|_| ParamParseError::InvalidTimestamp {
            value: input.to_string(),
        })?;

    let utc_dt: DateTime<Utc> = dt.into();

    // Convert to milliseconds since epoch
    let millis = utc_dt.timestamp_millis();

    // Use PoSQLTimeUnit::Millisecond and PoSQLTimeZone::UTC
    Ok(LiteralValue::TimeStampTZ(
        PoSQLTimeUnit::Millisecond,
        PoSQLTimeZone::utc(),
        millis,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== VARCHAR TESTS =====

    #[test]
    fn test_parse_varchar_double_quotes() {
        let result = parse_literal_value(r#""hello world""#).unwrap();
        assert!(matches!(result, LiteralValue::VarChar(ref s) if s == "hello world"));
    }

    #[test]
    fn test_parse_varchar_single_quotes() {
        let result = parse_literal_value("'hello world'").unwrap();
        assert!(matches!(result, LiteralValue::VarChar(ref s) if s == "hello world"));
    }

    #[test]
    fn test_parse_varchar_with_escapes() {
        let result = parse_literal_value(r#""hello\nworld""#).unwrap();
        assert!(matches!(result, LiteralValue::VarChar(ref s) if s == "hello\nworld"));
    }

    #[test]
    fn test_parse_varchar_with_escaped_quote() {
        let result = parse_literal_value(r#""hello\"world""#).unwrap();
        assert!(matches!(result, LiteralValue::VarChar(ref s) if s == "hello\"world"));
    }

    #[test]
    fn test_parse_varchar_empty() {
        let result = parse_literal_value(r#""""#).unwrap();
        assert!(matches!(result, LiteralValue::VarChar(ref s) if s.is_empty()));
    }

    // ===== BOOLEAN TESTS =====

    #[test]
    fn test_parse_boolean_true() {
        let result = parse_literal_value("true").unwrap();
        assert_eq!(result, LiteralValue::Boolean(true));
    }

    #[test]
    fn test_parse_boolean_false() {
        let result = parse_literal_value("false").unwrap();
        assert_eq!(result, LiteralValue::Boolean(false));
    }

    #[test]
    fn test_parse_boolean_t() {
        let result = parse_literal_value("t").unwrap();
        assert_eq!(result, LiteralValue::Boolean(true));
    }

    #[test]
    fn test_parse_boolean_f() {
        let result = parse_literal_value("f").unwrap();
        assert_eq!(result, LiteralValue::Boolean(false));
    }

    #[test]
    fn test_parse_boolean_case_insensitive() {
        assert_eq!(
            parse_literal_value("TRUE").unwrap(),
            LiteralValue::Boolean(true)
        );
        assert_eq!(
            parse_literal_value("False").unwrap(),
            LiteralValue::Boolean(false)
        );
        assert_eq!(
            parse_literal_value("T").unwrap(),
            LiteralValue::Boolean(true)
        );
        assert_eq!(
            parse_literal_value("F").unwrap(),
            LiteralValue::Boolean(false)
        );
    }

    // ===== INTEGER TESTS =====

    #[test]
    fn test_parse_bigint_default() {
        let result = parse_literal_value("42").unwrap();
        assert_eq!(result, LiteralValue::BigInt(42));
    }

    #[test]
    fn test_parse_bigint_negative() {
        let result = parse_literal_value("-42").unwrap();
        assert_eq!(result, LiteralValue::BigInt(-42));
    }

    #[test]
    fn test_parse_bigint_with_suffix() {
        let result = parse_literal_value("42_i64").unwrap();
        assert_eq!(result, LiteralValue::BigInt(42));
    }

    #[test]
    fn test_parse_bigint_max() {
        let result = parse_literal_value("9223372036854775807").unwrap();
        assert_eq!(result, LiteralValue::BigInt(i64::MAX));
    }

    #[test]
    fn test_parse_bigint_min() {
        let result = parse_literal_value("-9223372036854775808").unwrap();
        assert_eq!(result, LiteralValue::BigInt(i64::MIN));
    }

    #[test]
    fn test_parse_tinyint() {
        let result = parse_literal_value("127_i8").unwrap();
        assert_eq!(result, LiteralValue::TinyInt(127));
    }

    #[test]
    fn test_parse_tinyint_negative() {
        let result = parse_literal_value("-128_i8").unwrap();
        assert_eq!(result, LiteralValue::TinyInt(-128));
    }

    #[test]
    fn test_parse_smallint() {
        let result = parse_literal_value("32767_i16").unwrap();
        assert_eq!(result, LiteralValue::SmallInt(32767));
    }

    #[test]
    fn test_parse_smallint_negative() {
        let result = parse_literal_value("-32768_i16").unwrap();
        assert_eq!(result, LiteralValue::SmallInt(-32768));
    }

    #[test]
    fn test_parse_int() {
        let result = parse_literal_value("2147483647_i32").unwrap();
        assert_eq!(result, LiteralValue::Int(2147483647));
    }

    #[test]
    fn test_parse_int_negative() {
        let result = parse_literal_value("-2147483648_i32").unwrap();
        assert_eq!(result, LiteralValue::Int(-2147483648));
    }

    // ===== DECIMAL TESTS =====

    #[test]
    fn test_parse_decimal() {
        let result = parse_literal_value("123.45").unwrap();
        assert!(matches!(result, LiteralValue::Decimal75(_, 2, _)));
    }

    #[test]
    fn test_parse_decimal_negative() {
        let result = parse_literal_value("-123.45").unwrap();
        assert!(matches!(result, LiteralValue::Decimal75(_, 2, _)));
    }

    #[test]
    fn test_parse_decimal_many_digits() {
        let result = parse_literal_value("123.456789").unwrap();
        assert!(matches!(result, LiteralValue::Decimal75(_, 6, _)));
    }

    // ===== VARBINARY TESTS =====

    #[test]
    fn test_parse_varbinary_lowercase() {
        let result = parse_literal_value("0xdeadbeef").unwrap();
        assert!(
            matches!(result, LiteralValue::VarBinary(ref bytes) if bytes == &vec![0xde, 0xad, 0xbe, 0xef])
        );
    }

    #[test]
    fn test_parse_varbinary_uppercase() {
        let result = parse_literal_value("0xDEADBEEF").unwrap();
        assert!(
            matches!(result, LiteralValue::VarBinary(ref bytes) if bytes == &vec![0xde, 0xad, 0xbe, 0xef])
        );
    }

    #[test]
    fn test_parse_varbinary_mixed_case() {
        let result = parse_literal_value("0xDeAdBeEf").unwrap();
        assert!(
            matches!(result, LiteralValue::VarBinary(ref bytes) if bytes == &vec![0xde, 0xad, 0xbe, 0xef])
        );
    }

    #[test]
    fn test_parse_varbinary_empty() {
        let result = parse_literal_value("0x").unwrap();
        assert!(matches!(result, LiteralValue::VarBinary(ref bytes) if bytes.is_empty()));
    }

    // ===== TIMESTAMP TESTS =====

    #[test]
    fn test_parse_timestamp_rfc3339() {
        let result = parse_literal_value("2023-12-25T10:30:00Z").unwrap();
        assert!(
            matches!(result, LiteralValue::TimeStampTZ(PoSQLTimeUnit::Millisecond, ref tz, _) if tz == &PoSQLTimeZone::utc())
        );
    }

    #[test]
    fn test_parse_timestamp_with_timezone() {
        let result = parse_literal_value("2023-12-25T10:30:00+05:30").unwrap();
        assert!(
            matches!(result, LiteralValue::TimeStampTZ(PoSQLTimeUnit::Millisecond, ref tz, millis) if tz == &PoSQLTimeZone::utc() && millis > 0)
        );
    }

    // ===== ERROR TESTS =====

    #[test]
    fn test_error_invalid_escape() {
        let result = parse_literal_value(r#""hello\xworld""#);
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidEscapeSequence)
        ));
    }

    #[test]
    fn test_error_unescaped_quote() {
        let result = parse_literal_value(r#""hello"world""#);
        assert!(matches!(
            result,
            Err(ParamParseError::UnescapedQuoteInString)
        ));
    }

    #[test]
    fn test_error_invalid_hex() {
        let result = parse_literal_value("0xGGGG");
        assert!(matches!(result, Err(ParamParseError::InvalidHex { .. })));
    }

    #[test]
    fn test_error_invalid_integer_tinyint() {
        let result = parse_literal_value("999_i8");
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidInteger { .. })
        ));
    }

    #[test]
    fn test_error_invalid_integer_smallint() {
        let result = parse_literal_value("99999_i16");
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidInteger { .. })
        ));
    }

    #[test]
    fn test_error_invalid_integer_int() {
        let result = parse_literal_value("9999999999_i32");
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidInteger { .. })
        ));
    }

    #[test]
    fn test_error_invalid_integer_bigint_overflow() {
        // Test value larger than i64::MAX
        let result = parse_literal_value("9223372036854775808");
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidInteger { .. })
        ));
    }

    #[test]
    fn test_error_invalid_integer_bigint_underflow() {
        // Test value smaller than i64::MIN
        let result = parse_literal_value("-9223372036854775809");
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidInteger { .. })
        ));
    }

    #[test]
    fn test_error_invalid_integer_bigint_with_suffix_overflow() {
        let result = parse_literal_value("9223372036854775808_i64");
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidInteger { .. })
        ));
    }

    #[test]
    fn test_error_invalid_decimal() {
        let result = parse_literal_value("123.45.67");
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidDecimal { .. })
        ));
    }

    #[test]
    fn test_error_invalid_timestamp() {
        let result = parse_literal_value("not-a-timestamp");
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidTimestamp { .. })
        ));
    }

    #[test]
    fn test_error_invalid_precision() {
        // Try to parse a decimal with more than 75 digits (exceeds Decimal75 precision)
        let result = parse_literal_value(
            "1234567890123456789012345678901234567890123456789012345678901234567890123456.0",
        );
        // This may fail with InvalidDecimal if the number is too large to parse,
        // or with InvalidPrecision if the precision exceeds the limit.
        // The important fix is that we don't panic with unwrap().
        assert!(matches!(
            result,
            Err(ParamParseError::InvalidPrecision { .. })
                | Err(ParamParseError::InvalidDecimal { .. })
        ));
    }
}
