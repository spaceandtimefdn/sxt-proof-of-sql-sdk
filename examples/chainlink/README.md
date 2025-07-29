# Space and Time (SxT) Proof of SQL SDK

## Introduction
This example shows how to use Chainlink functions to access the SxT network API within your ethereum smart contract. See [README](../../README.md) for an overview of the SDK.

## Setup

Chainlink integration requires several components to operate correctly. Follow the [Chainlink setup guide](https://docs.chain.link/Chainlink-functions), and make sure you have the following:

| Variable           | Description                                                                                                   |
|--------------------|---------------------------------------------------------------------------------------------------------------|
| ETHEREUM_SEPOLIA_RPC_URL   | Used to interact with the smart contract. Use an RPC connection for the Sepolia testnet for this example.     |
| SXT_API_KEY        | An API key is required to interact with SxT services. To obtain an API key, please refer to the [Space and Time docs](https://docs.spaceandtime.io/docs/accreditation-use-api-keys). |
| CONSUMER_ADDRESS   | The address of the deployed smart contract that interacts with the Chainlink network.                        |
| LINK_TOKEN_ADDRESS | Contains link tokens that are used to pay for the work done by the Chainlink DON.                             |
| SUBSCRIPTION_ID    | The ID number of the subscriber to the LINK address.                                                          |
| PRIVATE_KEY        | Secret key for the Ethereum wallet used to pay for fees on the Sepolia testnet.                               |

All of these secrets will eventually be set as environment variables that are used to interact with Chainlink. You must have a [smart contract deployed](https://docs.chain.link/chainlink-functions/tutorials/api-use-secrets#deploy-a-functions-consumer-contract-on-sepolia) in order to interact with Chainlink.

### Install Node

Follow instructions here: https://nodejs.org/en/download/package-manager

## Running the Chainlink Example

1. From inside the Chainlink examples directory, run ```npm install``` to obtain the required dependencies.

2. Next, set your encrypted environment variables defined in the previous section with ```npx```:

```bash
npx env-enc set-pw
```
This creates an encrypted secret store for your keys and URLs. Make sure this file is ignored from git.

3. Next, set all of the environment variables. It should look something like this:

```
npx env-enc set
Please enter the variable name (or press ENTER to finish): 
SUBSCRIPTION_ID
Please enter the variable value (input will be hidden): 
****
Would you like to set another variable? Please enter the variable name (or press ENTER to finish):
```

4. The actual API call to the SxT network is setup with the SxTClient in the included [source.js](./source.js) file. 
You can define the query string and any operations you wish to complete in this file. 
This example computes the average number of transactions per block on the ethereum network:

```javascript
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
let t_count = result.table.t_count.Int[0];
let b_count = result.table.b_count.BigInt[0];

console.log("Average eth transactions per block: ");
return Functions.encodeUint256(Math.floor(t_count / b_count));
```
[functionsClient.json](./abi/functionsClient.json) is obtained directly from [Chainlink](https://github.com/smartcontractkit/smart-contract-examples/blob/main/functions-examples/abi/functionsClient.json) and is unmodified. It is required to sign a transaction
and to communicate with the smart contract that was deployed earlier. It defines an interface for communicating with the contract and
must be provided for each new smart contract.

[request.js](./request.js) is obtained directly from Chainlink [here](https://github.com/smartcontractkit/smart-contract-examples/blob/main/functions-examples/examples/5-use-secrets-threshold/request.js). 
It communicates with the Chainlink network, pays any gas fees associated with the request, and sends the javascript source code to the
Chainlink nodes for execution. The following modifications are made in the [request.js](./request.js) file included with this example:

```javascript

// This is the address of the deployed smart contract that will interact with chainlink
const consumerAddress = process.env.CONSUMER_ADDRESS;

// changed to accept an encrypted environment variable specific to the 
// LINK address used to pay for the work done by the DON
const linkTokenAddress = process.env.LINK_TOKEN_ADDRESS;

// Changed to accept the SXT api key instead of the Coinmarketcap api key
const secrets = { apiKey: process.env.SXT_API_KEY };

// This is the subscription ID attached to the subscriber of the LINK address.
// Subscriptions can be managed at https://functions.chain.link/
const subscriptionId = process.env.SUBSCRIPTION_ID
```

Then run with the following:

```bash
node examples/chainlink/request.js
```

A simulation is run to verify that the [```source.js```](./source.js) file can successfully execute. A successful simulation might produce output looking like this:

```
Start simulation...
Simulation result {
  capturedTerminalOutput: 'Average eth transactions per block: \n',
  responseBytesHexstring: '0x00000000000000000000000000000000000000000000000000000000000000a8'
}
✅ Decoded response to uint256:  168n
```

After the transaction proceeds to the Chainlink network, a successful result might look like this:

```
✅ Request XXXX successfully fulfilled. Cost is 0.33235819007569347 LINK.Complete response:  {
  requestId: 'XXXX',
  subscriptionId: XXXX,
  totalCostInJuels: 332358190075693470n,
  responseBytesHexstring: '0x00000000000000000000000000000000000000000000000000000000000000a8',
  errorString: '',
  returnDataBytesHexstring: '0x',
  fulfillmentCode: 0
}

✅ Decoded response to uint256:  168n
```
