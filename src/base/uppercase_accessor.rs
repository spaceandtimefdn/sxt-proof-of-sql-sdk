use proof_of_sql::base::{
    commitment::Commitment,
    database::{ColumnType, CommitmentAccessor, MetadataAccessor, SchemaAccessor, TableRef},
};
use proof_of_sql_planner::uppercase_identifier;
use sqlparser::ast::Ident;

pub fn uppercase_table_ref(table_ref: TableRef) -> TableRef {
    TableRef::from_idents(
        table_ref.schema_id().cloned().map(uppercase_identifier),
        uppercase_identifier(table_ref.table_id().clone()),
    )
}

/// Generic wrapper of proof-of-sql `-Accessor` types that coerces to uppercase.
///
/// Sxt-chain generally stores identifiers in all uppercase.
/// The SDK uses accessors in this casing due to using a `QueryCommitments` built from chain data.
/// So, this wrapper helps bridge the gap between the casing of queries/proof plans to chain data.
#[derive(Clone)]
pub struct UppercaseAccessor<'a, A>(pub &'a A);

impl<SA> SchemaAccessor for UppercaseAccessor<'_, SA>
where
    SA: SchemaAccessor,
{
    fn lookup_column(&self, table_ref: &TableRef, column_id: &Ident) -> Option<ColumnType> {
        let ident = uppercase_identifier(column_id.clone());
        self.0
            .lookup_column(&uppercase_table_ref(table_ref.clone()), &ident)
    }

    fn lookup_schema(&self, table_ref: &TableRef) -> Vec<(Ident, ColumnType)> {
        self.0
            .lookup_schema(&uppercase_table_ref(table_ref.clone()))
            .into_iter()
            .map(|(ident, column_type)| {
                let ident = uppercase_identifier(ident);
                (ident, column_type)
            })
            .collect()
    }
}

impl<MA> MetadataAccessor for UppercaseAccessor<'_, MA>
where
    MA: MetadataAccessor,
{
    fn get_length(&self, table_ref: &TableRef) -> usize {
        let table_ref = uppercase_table_ref(table_ref.clone());

        self.0.get_length(&table_ref)
    }

    fn get_offset(&self, table_ref: &TableRef) -> usize {
        let table_ref = uppercase_table_ref(table_ref.clone());

        self.0.get_offset(&table_ref)
    }
}

impl<CA, C> CommitmentAccessor<C> for UppercaseAccessor<'_, CA>
where
    CA: CommitmentAccessor<C>,
    C: Commitment,
{
    fn get_commitment(&self, table_ref: &TableRef, column_id: &Ident) -> C {
        self.0.get_commitment(
            &uppercase_table_ref(table_ref.clone()),
            &uppercase_identifier(column_id.clone()),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proof_of_sql::{
        base::{
            commitment::{QueryCommitments, TableCommitment},
            database::OwnedColumn,
        },
        proof_primitive::dory::{DoryScalar, DynamicDoryCommitment, ProverSetup, PublicParameters},
    };

    #[test]
    fn we_can_get_uppercase_items_from_lowercase() {
        let public_parameters = PublicParameters::test_rand(2, &mut rand::thread_rng());
        let setup = ProverSetup::from(&public_parameters);

        let lowercase_col = Ident::new("col");
        let uppercase_col = Ident::new("COL");

        let lowercase_table_ref: TableRef = "schema.table".parse().unwrap();
        let uppercase_table_ref: TableRef = "SCHEMA.TABLE".parse().unwrap();

        let commitment = TableCommitment::try_from_columns_with_offset(
            [(
                &uppercase_col,
                &OwnedColumn::<DoryScalar>::Boolean(vec![false]),
            )],
            0,
            &&setup,
        )
        .unwrap();

        let accessor = QueryCommitments::<DynamicDoryCommitment>::from_iter([(
            uppercase_table_ref,
            commitment.clone(),
        )]);

        assert_eq!(
            accessor.lookup_column(&lowercase_table_ref, &lowercase_col),
            None
        );
        assert_eq!(
            UppercaseAccessor(&accessor).lookup_column(&lowercase_table_ref, &lowercase_col),
            Some(ColumnType::Boolean)
        );

        assert_eq!(
            UppercaseAccessor(&accessor).lookup_schema(&lowercase_table_ref),
            vec![(uppercase_col.clone(), ColumnType::Boolean)]
        );

        assert_eq!(
            UppercaseAccessor(&accessor).get_length(&lowercase_table_ref),
            1
        );
        assert_eq!(
            UppercaseAccessor(&accessor).get_offset(&lowercase_table_ref),
            0
        );
        assert_eq!(
            UppercaseAccessor(&accessor).get_commitment(&lowercase_table_ref, &lowercase_col),
            commitment.column_commitments().commitments()[0]
        );
    }
}
