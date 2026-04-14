import { ConfidentialHTTPClient, Runtime, text } from "@chainlink/cre-sdk";
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