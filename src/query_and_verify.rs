use crate::{
    base::{zk_query_models::SxtNetwork, CommitmentScheme},
    native::SxTClient,
};
use arrow_csv::WriterBuilder;
use clap::Args;
use datafusion::arrow::{
    array::{BinaryArray, FixedSizeBinaryArray, LargeBinaryArray, StringArray},
    datatypes::DataType,
    record_batch::RecordBatch,
    util::pretty::pretty_format_batches,
};
use std::{path::PathBuf, sync::Arc};
use subxt::utils::H256;
use url::Url;

#[derive(Args, Debug, Clone, PartialEq, Eq)]
pub struct QueryAndVerifySdkArgs {
    /// SXT Network
    ///
    /// The SXT network to use.
    /// Can be set via SXT_NETWORK environment variable.
    #[arg(
        long,
        value_enum,
        default_value_t = SxtNetwork::Mainnet,
        env = "SXT_NETWORK"
    )]
    pub network: SxtNetwork,

    /// Root URL for SXT ZK Query API service
    ///
    /// Can be set via ZK_QUERY_ROOT_URL environment variable.
    #[arg(
        long,
        value_name = "ZK_QUERY_ROOT_URL",
        default_value = "https://api.makeinfinite.dev",
        env = "ZK_QUERY_ROOT_URL"
    )]
    pub zk_query_root_url: Url,

    /// Root URL for the Auth service
    ///
    /// Used for authentication requests.
    /// Can be set via AUTH_ROOT_URL environment variable.
    #[arg(
        long,
        value_name = "AUTH_ROOT_URL",
        default_value = "https://proxy.api.makeinfinite.dev",
        env = "AUTH_ROOT_URL"
    )]
    pub auth_root_url: Url,

    /// URL for the Substrate node service
    ///
    /// Specifies the Substrate node endpoint used for accessing commitment data.
    /// Can be set via SUBSTRATE_NODE_URL environment variable.
    #[arg(
        long,
        value_name = "SUBSTRATE_NODE_URL",
        default_value = "wss://rpc.testnet.sxt.network",
        env = "SUBSTRATE_NODE_URL"
    )]
    pub substrate_node_url: Url,

    /// API Key for Space and Time (SxT) services
    ///
    /// The API key required for authorization with Space and Time services.
    /// Can be set via SXT_API_KEY environment variable.
    #[arg(long, value_name = "SXT_API_KEY", env = "SXT_API_KEY")]
    pub sxt_api_key: String,

    /// SQL query to execute and verify
    #[arg(short, long, value_name = "QUERY", help = "SQL query to run")]
    pub query: String,

    /// SxT chain block hash to perform the query at.
    #[arg(long)]
    pub block_hash: Option<H256>,

    /// Commitment scheme to use for the query
    #[arg(
        long,
        value_enum,
        env,
        default_value_t = CommitmentScheme::HyperKzg,
    )]
    pub commitment_scheme: CommitmentScheme,

    /// Path to the verifier setup binary file
    ///
    /// Specifies the path to the verifier setup binary file required for verification.
    #[arg(
        long,
        value_name = "VERIFIER_SETUP",
        help = "Path to the verifier setup file. If not provided, defaults to the appropriate verifier setup for the selected commitment scheme."
    )]
    pub verifier_setup: Option<String>,

    /// The results will be put in a csv at the output path. If `None`, no csv will be saved
    #[arg(long)]
    pub csv_file_path: Option<PathBuf>,

    /// The source of the data
    #[arg(long, value_enum, env, default_value_t=SxtNetwork::Mainnet)]
    pub source_network: SxtNetwork,
}

impl From<&QueryAndVerifySdkArgs> for (SxTClient, CommitmentScheme) {
    fn from(args: &QueryAndVerifySdkArgs) -> Self {
        (
            SxTClient::new(
                args.network,
                args.zk_query_root_url.clone(),
                args.auth_root_url.clone(),
                args.substrate_node_url.clone(),
                args.sxt_api_key.clone(),
                args.verifier_setup.clone(),
            ),
            args.commitment_scheme,
        )
    }
}

fn cast_record_batch_to_csv_friendly_record_batch(record_batch: RecordBatch) -> RecordBatch {
    RecordBatch::try_from_iter(
        record_batch
            .schema()
            .fields()
            .iter()
            .zip(record_batch.columns().iter())
            .map(|(field, arr)| {
                (
                    field.name(),
                    match field.data_type().clone() {
                        DataType::LargeBinary => Arc::new(StringArray::from(
                            arr.as_any()
                                .downcast_ref::<LargeBinaryArray>()
                                .expect("Array should be LargeBinary")
                                .into_iter()
                                .map(|bin| hex::encode(bin.unwrap()))
                                .collect::<Vec<_>>(),
                        )),
                        DataType::FixedSizeBinary(_) => Arc::new(StringArray::from(
                            arr.as_any()
                                .downcast_ref::<FixedSizeBinaryArray>()
                                .expect("Array should be FixedSizeBinary")
                                .into_iter()
                                .map(|bin| hex::encode(bin.unwrap()))
                                .collect::<Vec<_>>(),
                        )),
                        DataType::Binary => Arc::new(StringArray::from(
                            arr.as_any()
                                .downcast_ref::<BinaryArray>()
                                .expect("Array should be BinaryArray")
                                .into_iter()
                                .map(|bin| hex::encode(bin.unwrap()))
                                .collect::<Vec<_>>(),
                        )),
                        _ => arr.clone(),
                    },
                )
            }),
    )
    .unwrap()
}

pub async fn query_and_verify(
    args: QueryAndVerifySdkArgs,
) -> Result<(), Box<dyn core::error::Error>> {
    let (client, commitment_scheme) = (&args).into();

    // Execute the query and verify the result
    let result: RecordBatch = client
        .query_and_verify(
            &args.query,
            args.block_hash.map(|bh| bh.0),
            commitment_scheme,
        )
        .await?
        .try_into()?;

    if let Some(path) = args.csv_file_path {
        let cast_result = cast_record_batch_to_csv_friendly_record_batch(result.clone());
        // Write to CSV
        let mut file_write = std::fs::File::create(path)?;
        let mut writer = WriterBuilder::new().build(&mut file_write);
        writer.write(&cast_result)?;
    }

    // Print the result of the query
    println!("Query result:\n{}", pretty_format_batches(&[result])?);
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::query_and_verify::cast_record_batch_to_csv_friendly_record_batch;
    use datafusion::arrow::array::{
        ArrayRef, BinaryArray, FixedSizeBinaryArray, LargeBinaryArray, RecordBatch, StringArray,
    };
    use std::sync::Arc;

    #[test]
    fn we_can_cast_binary_to_string() {
        let bin_collection: &[u8] = &[1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let string_array: ArrayRef = Arc::new(StringArray::from(vec![hex::encode(bin_collection)]));
        let large_binary_array: ArrayRef =
            Arc::new(LargeBinaryArray::from_vec(vec![bin_collection]));
        let binary_array: ArrayRef = Arc::new(BinaryArray::from_vec(vec![bin_collection]));
        let fixed_size_binary_array: ArrayRef =
            Arc::new(FixedSizeBinaryArray::from(vec![bin_collection]));
        let record_batch = RecordBatch::try_from_iter(vec![
            ("large", large_binary_array),
            ("small", binary_array),
            ("fixed", fixed_size_binary_array),
            ("string", string_array.clone()),
        ])
        .unwrap();
        let cast_record_batch = cast_record_batch_to_csv_friendly_record_batch(record_batch);
        let expected_record_batch = RecordBatch::try_from_iter(vec![
            ("large", string_array.clone()),
            ("small", string_array.clone()),
            ("fixed", string_array.clone()),
            ("string", string_array),
        ])
        .unwrap();
        assert_eq!(cast_record_batch, expected_record_batch);
    }
}
