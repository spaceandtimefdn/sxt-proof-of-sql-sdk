import { cre, HTTPPayload, Runner, type Runtime } from "@chainlink/cre-sdk";
import { proofOfSql } from "sxt-proof-of-sql-cre-sdk-typescript";

type Config = {}

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

const initWorkflow = () => {
	const httpTrigger = new cre.capabilities.HTTPCapability()

	return [cre.handler(httpTrigger.trigger({}), onHttpTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>();
    await runner.run(initWorkflow);
}

main()