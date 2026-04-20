import { ConfidentialHTTPClient, Runtime, text, hexToBytes } from "@chainlink/cre-sdk";
import { ZkQueryClientConfig } from "./zk-query-client-config";

export function getAccessToken<Config extends ZkQueryClientConfig>(runtime: Runtime<Config>): string | null {
    let confidentialClient = new ConfidentialHTTPClient();
    const response = confidentialClient
		.sendRequest(runtime, {
			request: {
				url: `${runtime.config.authUrl}/auth/apikey`,
				method: 'POST',
				multiHeaders: { 'apikey': { values: [`{{.${runtime.config.sxtApiKeySecretKey}}}`] } },
			},
			vaultDonSecrets: [
				{
					key: runtime.config.sxtApiKeySecretKey
				},
			],
		})
		.result()
	return response.statusCode === 200 ? JSON.parse(text(response)).accessToken ?? null : null;
}

export function submitZkQuery<Config extends ZkQueryClientConfig>(
	runtime: Runtime<Config>, 
	accessToken: string, 
	proofPlan: string | Uint8Array,
	queryParameters: string | Uint8Array,
	blockHash: string | Uint8Array
): string {
	let confidentialClient = new ConfidentialHTTPClient();
    const response = confidentialClient
		.sendRequest(runtime, {
			request: {
				url: `${runtime.config.zkQueryUrl}/async-zkquery/submit`,
				method: 'POST',
				multiHeaders: { 
					'Authorization': { 
						values: [`Bearer ${accessToken}`] 
					},
					'Content-Type': {
						values: ['application/json']
					}
				},
				bodyString: JSON.stringify({
					proofPlan: Array.from(typeof proofPlan === 'string' ? hexToBytes(proofPlan) : proofPlan),
					queryParameters: Array.from(typeof queryParameters === 'string' ? hexToBytes(queryParameters) : queryParameters),
					blockHash: Array.from(typeof blockHash === 'string' ? hexToBytes(blockHash) : blockHash),
					sourceNetwork: "MAINNET",
					fulfillerId: "cre"
				}),
			},
			vaultDonSecrets: [],
		})
		.result()
	return JSON.stringify(response);
}
