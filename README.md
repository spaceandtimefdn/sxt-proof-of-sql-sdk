# Space and Time (SxT) Proof of SQL SDK

An SDK to help users interact with the Space and Time (SxT) TestNet and execute Proof of SQL queries.

## Introduction

The Space and Time Proof of SQL SDK is a Rust crate designed to simplify the process of running SQL queries against the Space and Time TestNet and verifying the results using cryptographic proofs. It leverages the [Proof of SQL](https://github.com/spaceandtimelabs/sxt-proof-of-sql) framework to ensure the integrity and correctness of query results.

## Installation

Make sure you have the following installed:
- [protoc](https://protobuf.dev/installation/)
- OpenSSL

On Debian-based Linux distros you can do the following to install all of them
```bash
apt update && apt upgrade -y
apt install -y protobuf-compiler pkg-config libssl-dev
```

Add the following to your `Cargo.toml`:

```toml
[dependencies]
sxt-proof-of-sql-sdk = "0.1.0"
```
Then, run:

```bash
cargo build
```

## Usage
### SXT PoSQL CLI

To use the CLI:

```bash
cargo run --bin sxt-posql-cli -- -q "select * from ethereum.blocks" --sxt-api-key "your_sxt_api_key"
```
Alternatively you may set your SxT API key via the environment variable `SXT_API_KEY`.

For more options, you can view the help text with:
```bash
cargo run --bin sxt-posql-cli -- --help
```

### SXT PoSQL Plan Producer

To use the SXT PoSQL Plan Producer:

```bash
cargo run --example produce-plan -- -q "select * from ethereum.blocks" --sxt-api-key "your_sxt_api_key"
```
Alternatively you may set your SxT API key via the environment variable `SXT_API_KEY`.

For more options, you can view the help text with:
```bash
cargo run --bin sxt-posql-cli -- --help
```

### Running Example

To run the provided example that counts entries in the Ethereum core tables:

```bash
cargo run --example count-ethereum-core --sxt-api-key "your_sxt_api_key"
```
Alternatively you may set your SxT API key via the environment variable `SXT_API_KEY`.

For more options, you can view the help text with:
```bash
cargo run --example count-ethereum-core -- --help
```

### Basic Usage in Code

Here's how you can use the `SxTClient` in your Rust application:

```rust

use sxt_proof_of_sql_sdk::SxTClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the SxT client with necessary URLs and API key
    let client = SxTClient::new(
        "https://api.makeinfinite.dev".to_string(),
        "https://proxy.api.makeinfinite.dev".to_string(),
        "https://rpc.testnet.sxt.network".to_string(),
        "your_sxt_api_key".to_string(),
        "path/to/verifier_setups/dynamic_dory.bin".to_string(),
    );

    // Execute and verify a SQL query
    let result = client
        .query_and_verify("SELECT COUNT(*) FROM ethereum.transactions", "ethereum.transactions")
        .await?;

    println!("Query Result: {:?}", result);
    Ok(())
}
```

Note: Replace "your_sxt_api_key" with your actual SxT API key, and ensure the verifier setup binary file is correctly specified. For example for Dynamic Dory you can use the [file here](./verifier_setups/dynamic_dory.bin) or fetch the files [here](https://github.com/spaceandtimelabs/sxt-proof-of-sql/releases/tag/dory-prover-params-nu-16).

## JavaScript Support

See [deno](./examples/deno) and [node](./examples/node) in this repo for examples of JavaScript support.

## Getting an API Key

To obtain an API key for accessing SxT services, please refer to the [Space and Time docs](https://docs.spaceandtime.io/docs/accreditation-use-api-keys).

## License

This project is licensed under the terms of the [Cryptographic Open Software License 1.0](https://github.com/spaceandtimelabs/sxt-proof-of-sql-sdk/blob/main/LICENSE).