import {proofOfSqlQuery} from "@spaceandtime/ts-proof-of-sql-sdk";

async function main() {
    const result = await proofOfSqlQuery("select TIME_STAMP, BLOCK_NUMBER from ethereum.blocks limit 1", "YOUR_SXT_API_KEY");
    console.log(result);
    const response = await fetch("http://localhost:2000/trigger?workflowID=0x004eaecf512dfaac2f98046d6b93f20d590bb6310b54d3b1daa45795c1dd3066", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "input": result
        })
    });
    console.log(response);
}

main();