use futures::StreamExt;
use indexmap::IndexMap;
use proof_of_sql::base::database::OwnedColumn;
use std::{cmp::Ordering, env, fs::File, io::BufReader, path::Path, sync::Arc};
use sxt_proof_of_sql_sdk::SxTClient;

const ETHEREUM_CORE_COUNTS_FILE: &str = "ethereum-core-counts.json";

const ETHEREUM_CORE_TABLES: [&str; 11] = [
    "ETHEREUM.BLOCKS",
    "ETHEREUM.BLOCK_DETAILS",
    "ETHEREUM.TRANSACTIONS",
    "ETHEREUM.TRANSACTION_DETAILS",
    "ETHEREUM.CONTRACTS",
    "ETHEREUM.TOKENS",
    "ETHEREUM.NFT_COLLECTIONS",
    "ETHEREUM.NFTS",
    "ETHEREUM.NATIVETOKEN_TRANSFERS",
    "ETHEREUM.FUNGIBLETOKEN_WALLETS",
    "ETHEREUM.ERC1155_OWNERS",
];

/// Count the number of rows in a table
async fn count_table(
    client: &SxTClient,
    table_ref: &str,
) -> Result<i64, Box<dyn core::error::Error>> {
    let uppercased_table_ref = table_ref.to_uppercase();
    let query = format!("SELECT COUNT(*) FROM {uppercased_table_ref}");
    let table = client
        .query_and_verify(&query, &uppercased_table_ref)
        .await?;
    assert_eq!(table.num_columns(), 1);
    assert_eq!(table.num_rows(), 1);

    let column = table.into_inner().swap_remove_index(0).unwrap().1;
    let OwnedColumn::BigInt(int_column) = column else {
        panic!("count query should return an int64 column")
    };

    Ok(int_column[0])
}

/// Compare current and previous counts and warn if current is less than previous or if current is absent while previous is present
fn compare_counts(
    current_counts: &IndexMap<String, i64>,
    previous_counts: &IndexMap<String, i64>,
    table_names: &[&str],
) {
    for table_name in table_names {
        let current_count = current_counts.get(*table_name).unwrap_or(&0);
        let previous_count = previous_counts.get(*table_name).unwrap_or(&0);
        match previous_count.cmp(current_count) {
            Ordering::Less => {
                log::info!(
                    "count of {table_name} increased from {previous_count} to {current_count}"
                );
            }
            Ordering::Equal => {
                log::warn!("count of {table_name} was and remains {current_count}");
            }
            Ordering::Greater => {
                log::error!(
                    "count of {table_name} decreased from {previous_count} to {current_count}"
                );
            }
        }
    }
}

/// Load the previous counts file
fn load_from_file(file_path: &str) -> IndexMap<String, i64> {
    // Check if the file exists
    if !Path::new(file_path).exists() {
        return IndexMap::new();
    }
    let file = File::open(file_path).expect("failed to open file");
    let mut reader = BufReader::new(&file);
    serde_json::from_reader(&mut reader).expect("failed to parse file")
}

/// Save the current counts to a file
fn save_to_file(counts: &IndexMap<String, i64>, file_path: &str) {
    let file = File::create(file_path).expect("failed to create file");
    serde_json::to_writer(&file, counts).expect("failed to write file");
}

#[tokio::main]
async fn main() {
    env_logger::init();
    dotenv::dotenv().unwrap();
    let client = Arc::new(SxTClient::new(
        env::var("PROVER_ROOT_URL").unwrap_or("https://api.spaceandtime.dev".to_string()),
        env::var("AUTH_ROOT_URL").unwrap_or("https://proxy.api.spaceandtime.dev".to_string()),
        env::var("SUBSTRATE_NODE_URL").unwrap_or("https://rpc.testnet.sxt.network".to_string()),
        env::var("SXT_API_KEY").expect("SXT_API_KEY is required"),
        env::var("VERIFIER_SETUP").unwrap_or("verifier_setup.bin".to_string()),
    ));

    let current_counts: IndexMap<String, i64> = futures::stream::iter(ETHEREUM_CORE_TABLES)
        .filter_map(|table_ref| {
            let client = client.clone();
            async move {
                log::info!("querying count of {table_ref}");
                let count = count_table(client.as_ref(), table_ref)
                    .await
                    .inspect_err(|e| log::error!("failed to query count for {table_ref}: {e}"))
                    .ok()?;

                Some((table_ref.to_string(), count))
            }
        })
        .collect()
        .await;
    save_to_file(&current_counts, ETHEREUM_CORE_COUNTS_FILE);
    // Compare previous and current counts
    let previous_counts = load_from_file(ETHEREUM_CORE_COUNTS_FILE);
    compare_counts(&current_counts, &previous_counts, &ETHEREUM_CORE_TABLES);
}
