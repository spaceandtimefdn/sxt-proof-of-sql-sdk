# Summary
This will be a brief tutorial explaining how to run proof of sql queries using CRE Http workflows.

# Step 1: CRE Prerequisites
We recommend you familiarize yourself with the basics of CRE workflows (creating a CRE account, setting up your local environment, creating workflows, and simulating workflows). Refer to the [CRE docs](https://docs.chain.link/cre/getting-started/part-1-project-setup-ts#prerequisites) for basics.

# Step 2: Acquire an SXT API Key
Create [here](https://app.spaceandtime.ai/settings/myPlan/apiAuthentication).

# Step 3: Create your root directory:
We will call ours `verify-via-http-e2e`. Run `mkdir verify-via-http-e2e && cd verify-via-http-e2e`.

# Step 4: Create an Http Workflow
Create the default CRE hello world typescript project with `cre init --non-interactive -p workflow -w verify-via-http -t hello-world-ts && cd workflow`. Replace everything in `main.ts` with the following:
```
import { cre, HTTPPayload, Runner, type Runtime } from "@chainlink/cre-sdk";

type Config = {}

const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  return "Success";
};

const initWorkflow = () => {
	const httpTrigger = new cre.capabilities.HTTPCapability()

	return [cre.handler(httpTrigger.trigger({}), onHttpTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>();
    await runner.run(initWorkflow);
}

main()
```
At this point, you should be able to run `cre workflow simulate ./verify-via-http --non-interactive --tri
gger-index 0 --target staging-settings --http-payload "{"bogus": "mock"}"` successfully.
This tutorial was created with version 1.10.0 of the CLI, so just use `cre init` if the first command wasn't working for you. The cli experience may change with version changes, so be sure to reference these [CRE docs](https://docs.chain.link/cre/getting-started/part-1-project-setup-ts#step-2-initialize-your-project) as needed.


# Step 5: Import the `sxt-proof-of-sql-cre-sdk-typescript` package and update `cre-sdk` accordingly.
Modify the dependecies in `package.json` to be 
```
"dependencies": {
  "@chainlink/cre-sdk": "1.5.0-alpha.3",
  "sxt-proof-of-sql-cre-sdk-typescript": "0.0.1"
}
```
and run `bun install --cwd ./verify-via-http`.

# Step 6: Convert the workflow to use custom builds.
Run `cre workflow custom-build ./verify-via-http -f`.
Refer to the [CRE docs](https://docs.chain.link/cre/guides/operations/custom-build#convert-a-workflow-to-custom-build) as needed.

# Step 7: Modify the Makefile to include the `sxt-proof-of-sql-cre-sdk-typescript` plugins
The build script can be replaced with the following:
```
.PHONY: build

build:
	mkdir -p wasm
	bun cre-compile --plugin node_modules/sxt-proof-of-sql-cre-sdk-typescript/dist/sxt_proof_of_sql.plugin.wasm \
		main.ts \
		wasm/workflow.wasm

clean:
	rm -rf wasm
```

# Step 8: Modify the workflow to use proof of sql library.
Add the import line `import { proofOfSql } from "sxt-proof-of-sql-cre-sdk-typescript";`
The function `onHttpTrigger` can be replaced with the following:
```
const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  // The input is expected to be the result of the query "select BLOCK_NUMBER from ETHEREUM.BLOCKS LIMIT 1"
  const input = payload.input.toString();
  const queryResult = proofOfSql().verify(input, []);
  switch (queryResult.verificationStatus) {
    case "Failure":
      return "Failure";
    case "Success":
      const blockCountColumn = queryResult.result.BLOCK_NUMBER;
      switch (blockCountColumn.type){
        case "BigInt": 
          runtime.log(`First retrieved: ${blockCountColumn.column[0]}`);
          return "Success";
        default:
          return "Failure";
      }
  }
};
```
Simulation using the mock http input `"{"bogus": "mock"}"` should now return `"Failure"`.

# Step 9: Create trigger project
Run `mkdir ../trigger && cd ../trigger && npm init -y && npm install @spaceandtime/ts-proof-of-sql-sdk && touch index.js`. Copy the following into `index.js`:

```
const { proofOfSqlQuery } = require('@spaceandtime/ts-proof-of-sql-sdk');
const { execSync } = require('child_process');
const sxtApiKey = "{YOUR_API_KEY}";

async function main() {
    const result = await proofOfSqlQuery("select BLOCK_NUMBER from ETHEREUM.BLOCKS LIMIT 1", sxtApiKey);
    const res = execSync(`cd ../workflow && cre workflow simulate verify-via-http --non-interactive --trigger-index 0 --target staging-settings --http-payload '${JSON.stringify(result)}'`);
    console.log(res.toString());
}

main();
```
Be sure to copy your api key in. Obviously, only do this for local testing.

# Step 10: Simulate end to end
Run `node index.js`. The results of the cre simulation should be printed to your terminal.
