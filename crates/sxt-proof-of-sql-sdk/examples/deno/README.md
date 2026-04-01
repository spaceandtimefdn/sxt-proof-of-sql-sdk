# Space and Time (SxT) Proof of SQL SDK - Deno Example

## Introduction
This is a simple example showing how to use the Deno runtime to query SXTChain and verify the results. See [README](../../README.md) for an overview of the SDK.

## Install Deno

Follow instructions here: https://docs.deno.com/runtime/getting_started/installation/. Or just run
    ```
    curl -fsSL https://deno.land/install.sh | sh
    ```

## Getting an API Key

An API key is required to interact with SxT services. To obtain an API key, please refer to the [Space and Time docs](https://docs.spaceandtime.io/docs/accreditation-use-api-keys).

## Running Deno Example

The PoSQL SDK supports features JavaScript support. You can setup a deno environment in the following manner:

```javascript
// Import the package
const SxTSDK = await import("npm:sxt-proof-of-sql-sdk");

// Define test parameters
const queryString = "SELECT SUM(TRANSACTION_COUNT) as t_count, COUNT(*) as b_count FROM ETHEREUM.BLOCKS";
const table = "ETHEREUM.BLOCKS";


// Initialize the SxTClient instance
const proof = new SxTSDK.SxTClient(
    "https://api.makeinfinite.dev/v1/prove",
    "https://proxy.api.makeinfinite.dev/auth/apikey",
    "https://rpc.testnet.sxt.network/",
    Deno.env.get("SXT_API"),
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

Then export your API key, and run with the following:

```bash
export SXT_API="your api key here"
deno run --allow-net --allow-env examples/deno/query.js
```
