use datafusion::arrow::{error::ArrowError, record_batch::RecordBatch};
#[cfg(feature = "hyperkzg")]
use proof_of_sql::proof_primitive::hyperkzg::BNScalar;
use proof_of_sql::{base::database::OwnedTable, proof_primitive::dory::DoryScalar};
use serde::{Deserialize, Serialize};

/// Enum of [`OwnedTable`]s with different scalar types.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DynOwnedTable {
    /// Owned table with a [`DoryScalar`]. Used for Dynamic Dory.
    Dory(OwnedTable<DoryScalar>),
    /// Owned table with a [`BNScalar`]. Used for HyperKZG.
    #[cfg(feature = "hyperkzg")]
    BN(OwnedTable<BNScalar>),
}

impl TryFrom<DynOwnedTable> for RecordBatch {
    type Error = ArrowError;

    fn try_from(value: DynOwnedTable) -> Result<Self, Self::Error> {
        match value {
            DynOwnedTable::Dory(table) => table.try_into(),
            #[cfg(feature = "hyperkzg")]
            DynOwnedTable::BN(table) => table.try_into(),
        }
    }
}
