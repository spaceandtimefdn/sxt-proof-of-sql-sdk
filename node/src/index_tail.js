export class SxTClient {
  constructor(zkQueryRootURL, authRootURL, substrateNodeURL, sxtApiKey) {
    this.zkQueryRootURL = zkQueryRootURL;
    this.authRootURL = authRootURL;
    this.substrateNodeURL = substrateNodeURL;
    this.sxtApiKey = sxtApiKey;
  }

  async #getAccessToken() {
    // Ensure the API key is available
    if (!this.sxtApiKey) {
      throw Error("API Key Not Found");
    }
    const authResponse = await postHttpRequest({
      url: this.authRootURL,
      headers: {
        apikey: this.sxtApiKey,
        "Content-Type": "application/json",
      },
    });
    if (!authResponse.ok) {
      throw new Error(
        `Error querying auth endpoint: ${authResponse.status}: ${authResponse.statusText}`,
      );
    }
    return authResponse.json();
  }
  async #querySubstrateRpc(method, params = null) {
    const response = await postHttpRequest({
      url: this.substrateNodeURL,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        id: 1,
        jsonrpc: "2.0",
        method,
        params,
      }
    });

    if (!response.ok) {
      throw new Error(
        `Error querying RPC node: ${response.status}: ${response.statusText}`,
      );
    }

    return response.json()
  }
  async #getAttestations(blockHash = null) {
    if (!!blockHash) {
      return await this.#querySubstrateRpc("attestation_v1_attestationsForBlock", [`0x${blockHash}`])
    } else{
      return await this.#querySubstrateRpc("attestation_v1_bestRecentAttestations", null)
    }
  }
  async #postZkQueryApi(endpoint, accessToken, data) {
    const proverResponse = await postHttpRequest({
      url: `${this.zkQueryRootURL}${endpoint}`,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      data: data,
    });

    if (!proverResponse.ok) {
      throw new Error(
        `Error querying zk query api: ${proverResponse.status}: ${proverResponse.statusText}`,
      );
    }

    return proverResponse.json();
  }
  async #getZkQueryApi(endpoint, accessToken) {
    const proverResponse = await getHttpRequest({
      url: `${this.zkQueryRootURL}${endpoint}`,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      }
    });

    if (!proverResponse.ok) {
      throw new Error(
        `Error querying prover: ${proverResponse.status}: ${proverResponse.statusText}`,
      );
    }

    return proverResponse.json();
  }
  async #submitZkQueryRequest(accessToken, querySubmitRequest){
    return await this.#postZkQueryApi("/v1/zkquery", accessToken, querySubmitRequest)
  }
  async #getZkQueryStatus(accessToken, queryId){
    return await this.#getZkQueryApi(`/v1/zkquery/${queryId}/status`, accessToken)
  }
  async #getZkQueryResult(accessToken, queryId){
    return await this.#getZkQueryApi(`/v1/zkquery/${queryId}/results`, accessToken)
  }

  async queryAndVerify(queryString, blockHash = null) {
    const authResponse = await this.#getAccessToken();
    const accessToken = authResponse.accessToken;
    const attestationsResponse = await this.#getAttestations(blockHash)
    const bestBlockHash = attestationsResponse.result.attestationsFor

    const submitQueryResponse = await this.#submitZkQueryRequest(accessToken, {
      sqlText: queryString,
      sourceNetwork: "mainnet",
      commitmentScheme: "HYPER_KZG",
      blockHash: bestBlockHash,
      timeout: null
    });
    let queryId = submitQueryResponse.queryId

    let count = 0
    const statusResponse = (await this.#getZkQueryStatus(accessToken, queryId)).status
    let success = statusResponse === "done" || statusResponse === "failed" || statusResponse === "canceled"

    while (!success && count < 60){
      count++
      await sleep(1000)
      const statusResponse = (await this.#getZkQueryStatus(accessToken, queryId)).status
      success = statusResponse === "done" || statusResponse === "failed" || statusResponse === "canceled"
    }

    const proverResponseJson = await this.#getZkQueryResult(accessToken, queryId)

    const result = verify_prover_response_hyper_kzg(
      proverResponseJson
    );
    return result;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function postHttpRequest({ url, headers = {}, data = null }) {
  const controller = new AbortController();
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: data ? JSON.stringify(data) : undefined,
    signal: controller.signal,
  });
  return response;
}

async function getHttpRequest({ url, headers = {} }) {
  const controller = new AbortController();
  const response = await fetch(url, {
    method: "GET",
    headers: headers,
    signal: controller.signal,
  });
  return response;
}
