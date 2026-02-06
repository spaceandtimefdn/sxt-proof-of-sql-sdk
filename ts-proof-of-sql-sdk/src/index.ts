type AccessToken = {
    accessToken: string
}

type QuerySubmitResponse = {
    queryId: string
}

type QueryStatusResponse = {
    status: string,
}

async function getAccessToken(apiKey: string): Promise<string>{
  const response = await fetch("https://proxy.api.makeinfinite.dev/auth/apikey", {
    method: "POST",
    headers: { "apikey": apiKey }
  });
  return (await response.json() as AccessToken).accessToken
}

async function postQuerySubmitRequest(sqlText: string, accessToken: string): Promise<string>{
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
  return ((await response.json()) as QuerySubmitResponse).queryId;
}

async function getRequestStatus(queryId: string, accessToken: string): Promise<string>{
  const response = await fetch(`https://api.makeinfinite.dev/v1/zkquery/${queryId}/status`, {
    method: "GET", 
    headers: {
        "Authorization": `Bearer ${accessToken}` 
    }
  });
  return ((await response.json()) as QueryStatusResponse).status;
}

async function getResults(queryId: string, accessToken: string): Promise<string>{
    const response = await fetch(`https://api.makeinfinite.dev/v1/zkquery/${queryId}/results`, {
    method: "GET", 
    headers: {
        "Authorization": `Bearer ${accessToken}` 
    }
  });
  const bodyText = await response.json();
  return bodyText as string;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function proofOfSqlQuery(query: string, apiKey: string): Promise<string>{
  const accessToken = await getAccessToken(apiKey);
  const queryId = await postQuerySubmitRequest(query, accessToken);
  let success = false;
  let count = 0;
  while (!success && count < 60){
    count++;
    await sleep(1000)
    const statusResponse = await getRequestStatus(queryId, accessToken)
    success = statusResponse === "done" || statusResponse === "failed" || statusResponse === "canceled"
  }
  return await getResults(queryId, accessToken)
}
