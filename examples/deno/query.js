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

    let t_count = result.t_count.Int[0];
    let b_count = result.b_count.BigInt[0];
    console.log("Average eth transactions per block: ", t_count / b_count);

    console.log("Workflow completed successfully:", result);
} catch (error) {
    console.log("Workflow failed: ", error);
}
