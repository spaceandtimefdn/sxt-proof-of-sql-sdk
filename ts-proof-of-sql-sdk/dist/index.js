"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proofOfSqlQuery = void 0;
async function getAccessToken(apiKey) {
    const response = await fetch("https://proxy.api.makeinfinite.dev/auth/apikey", {
        method: "POST",
        headers: { "apikey": apiKey }
    });
    return (await response.json()).accessToken;
}
async function postQuerySubmitRequest(sqlText, accessToken) {
    const response = await fetch("https://api.makeinfinite.dev/v1/zkquery", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            sqlText: sqlText,
            sourceNetwork: "Mainnet"
        })
    });
    return (await response.json()).queryId;
}
async function getRequestStatus(queryId, accessToken) {
    const response = await fetch(`https://api.makeinfinite.dev/v1/zkquery/${queryId}/status`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });
    return (await response.json()).status;
}
async function getResults(queryId, accessToken) {
    const response = await fetch(`https://api.makeinfinite.dev/v1/zkquery/${queryId}/results`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });
    const bodyText = await response.json();
    return bodyText;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function proofOfSqlQuery(query, apiKey) {
    const accessToken = await getAccessToken(apiKey);
    const queryId = await postQuerySubmitRequest(query, accessToken);
    let success = false;
    let count = 0;
    while (!success && count < 60) {
        count++;
        await sleep(1000);
        const statusResponse = await getRequestStatus(queryId, accessToken);
        success = statusResponse === "done" || statusResponse === "failed" || statusResponse === "canceled";
    }
    return await getResults(queryId, accessToken);
}
exports.proofOfSqlQuery = proofOfSqlQuery;
