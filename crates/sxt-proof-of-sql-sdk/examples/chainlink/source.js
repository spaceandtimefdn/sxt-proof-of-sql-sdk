// Import the package
const SxTSDK = await import("npm:sxt-proof-of-sql-sdk@0.5");

// Define query parameters
const queryString = "SELECT SUM(TRANSACTION_COUNT) as t_count, COUNT(*) as b_count FROM ETHEREUM.BLOCKS";
const table = "ETHEREUM.BLOCKS";

// Initialize the SxTClient instance
const client = new SxTSDK.SxTClient(
    "https://api.makeinfinite.dev/v1/prove",
    "https://proxy.api.makeinfinite.dev/auth/apikey",
    "https://rpc.testnet.sxt.network/",
    secrets.apiKey,
);

// Kick off the proof and await execution
const result = await client.queryAndVerify(
    queryString,
    table
);

// Extract the results from the response
let t_count = result.t_count.Int[0];
let b_count = result.b_count.BigInt[0];

console.log("Average eth transactions per block: ");
return Functions.encodeUint256(Math.floor(t_count / b_count));
