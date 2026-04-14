# Summary
This will be a brief tutorial explaining how to run proof of sql queries using CRE Http workflows.

# Step 1: Prerequisites
- CRE basics: refer to the [CRE docs](https://docs.chain.link/cre/getting-started/part-1-project-setup-ts#prerequisites) as needed.
  - Install bun. This can be done with 
    ```
    sudo apt install unzip && curl -fsSL https://bun.com/install | bash && source /home/stuarttimwhite/.bashrc
    ```
  - Install CRE cli with `curl -sSL https://app.chain.link/cre/install.sh | bash` (version 1.10.0 is used in this tutorial)
  - Create a CRE account as described [here](https://docs.chain.link/cre/account/creating-account). Login using `cre login`.
  - Acquire a funded sepolia account.
- SXT basics:
  - Acquire an SXT API Key from [here](https://app.spaceandtime.ai/settings/myPlan/apiAuthentication). This will be used to query the SXT prover.

# Step 2: Create an empty Http Workflow
Create the default CRE hello world typescript project with 
```
cre init --non-interactive -p posql-demo -w http -t hello-world-ts && cd posql-demo
```
Replace everything in `main.ts` with the following:
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
At this point, you should be able to successfully run 
```
cre workflow simulate ./http --non-interactive --trigger-index 0 -T staging-settings --http-payload "{}"
```
Reference [CRE docs](https://docs.chain.link/cre/getting-started/part-1-project-setup-ts#step-2-initialize-your-project) as needed.


# Step 3: Add proof of sql as a dependency.
- Import the `sxt-proof-of-sql-cre-sdk-typescript` package and update `cre-sdk` accordingly:
  - Modify the dependecies in `package.json` to be 
    ```
    "dependencies": {
      "@chainlink/cre-sdk": "1.5.0-alpha.3",
      "sxt-proof-of-sql-cre-sdk-typescript": "0.0.1"
    }
    ```
  - Run `bun install --cwd ./http`.
- Plugin proof of sql build:
  - Convert the workflow to use custom builds using `cre workflow custom-build ./http -f`. Refer to the [CRE docs](https://docs.chain.link/cre/guides/operations/custom-build#convert-a-workflow-to-custom-build) as needed.
  - Replace everything in Makefile with:
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

# Step 4: Modify the workflow to use proof of sql library.
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
Simulation using an empty http input should now return `"Failure"`.

# Step 5: Simulate end to end
Run the following, being sure to replace `{YOUR_SXT_API_KEY}` with your SXT api key.
```
export SXT_API_KEY={YOUR_SXT_API_KEY} &&
export QUERY="select BLOCK_NUMBER from ETHEREUM.BLOCKS LIMIT 1" &&
output=$(npx @spaceandtime/ts-proof-of-sql-sdk) &&
cre workflow simulate http --non-interactive --trigger-index 0 -T staging-settings --http-payload $output
```
