# Space and Time (SxT) Proof of SQL SDK

## Introduction
This is a simple example showing how to use the node runtime to query SXTChain and verify the results. See [README](../../README.md) for an overview of the SDK.

## Install Node

Follow instructions here: https://nodejs.org/en/download/package-manager

## Getting an API Key

An API key is required to interact with SxT services. To obtain an API key, please refer to the [Space and Time docs](https://docs.spaceandtime.io/docs/accreditation-use-api-keys).

## Running Node Example

The PoSQL SDK supports features JavaScript support. You can setup a node environment in the following manner:

```javascript
// Import the package
const SxTSDK = await import("sxt-proof-of-sql-sdk");

// Define test parameters
const queryString = "SELECT SUM(TRANSACTION_COUNT) as t_count, COUNT(*) as b_count FROM ETHEREUM.BLOCKS";
const table = "ETHEREUM.BLOCKS";

// Initialize the SxTClient instance
const proof = new SxTSDK.SxTClient(
    "https://api.makeinfinite.dev/v1/prove",
    "https://proxy.api.makeinfinite.dev/auth/apikey",
    "https://rpc.testnet.sxt.network/",
    process.env.SXT_API,
);

try {
    // Kick off the proof and await execution
    const result = await proof.queryAndVerify(
        queryString,
        table
    );

    let t_count = result.table.t_count.Int[0];
    let b_count = result.table.b_count.BigInt[0];
    console.log("Average eth transactions per block: ", t_count / b_count);

    console.log("Workflow completed successfully:", result);
} catch (error) {
    console.log("Workflow failed: ", error);
}

```

Then run with the following:

```bash
export SXT_API="your sxt api key here"
node examples/node/query.js
```
