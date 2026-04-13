import {proofOfSqlQuery} from "@spaceandtime/ts-proof-of-sql-sdk";
import { execSync } from "child_process";
const sxtApiKey = "{YOUR_API_KEY}";

async function main() {
    const result = await proofOfSqlQuery("select BLOCK_NUMBER from ETHEREUM.BLOCKS LIMIT 1", sxtApiKey);
    const res = execSync(`cd ../workflow && cre workflow simulate verify-via-http --non-interactive --trigger-index 0 --target staging-settings --http-payload '${JSON.stringify(result)}'`);
    console.log(res.toString());
}

main();