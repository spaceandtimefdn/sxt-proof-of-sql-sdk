use super::{
    sxt_chain_runtime::api::runtime_types::{
        bounded_collections::bounded_vec::BoundedVec, sxt_core::tables::TableIdentifier,
    },
    DEFAULT_SCHEMA,
};
use proof_of_sql::base::database::TableRef;
use sqlparser::ast::Ident;

/// Convert sqlparser `Ident` to SxT Core `BoundedVec<u8>`
fn ident_to_byte_string(ident: &Ident) -> BoundedVec<u8> {
    BoundedVec::<u8>(ident.value.as_str().to_uppercase().as_bytes().to_vec())
}

/// Convert PoSQL `TableRef` to SxT Core table identifiers
pub fn table_ref_to_table_id(table_ref: &TableRef) -> TableIdentifier {
    let default_schema_ident = Ident::new(DEFAULT_SCHEMA);
    let namespace_ident = table_ref.schema_id().unwrap_or(&default_schema_ident);
    TableIdentifier {
        name: ident_to_byte_string(table_ref.table_id()),
        namespace: ident_to_byte_string(namespace_ident),
    }
}
