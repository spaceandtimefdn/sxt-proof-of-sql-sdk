//! Client for interacting with the ZK Query APIs
use crate::base::zk_query_models::{QueryPlanRequest, QueryPlanResponse};
use reqwest::Client;
use url::Url;

/// Struct for interacting with the ZK Query APIs
pub struct ZkQueryClient {
    /// Base URL for the ZK Query API
    pub base_url: Url,
    /// HTTP client for making requests
    pub client: Client,
    /// Access token for authentication, obtained using the API key
    pub access_token: String,
}

impl ZkQueryClient {
    /// Requests a proof plan from the ZK Query API.
    pub async fn get_zk_query_plan(
        &self,
        request: QueryPlanRequest,
    ) -> Result<QueryPlanResponse, Box<dyn core::error::Error>> {
        let response = self
            .client
            .post(self.base_url.join("/v1/zkquery/build-plan")?)
            .bearer_auth(&self.access_token)
            .json(&request)
            .send()
            .await?
            .error_for_status()?;
        let serialized_response = response.text().await?;
        Ok(
            serde_json::from_str::<QueryPlanResponse>(&serialized_response).map_err(|_e| {
                format!(
                    "Failed to parse query plan response: {}",
                    &serialized_response
                )
            })?,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{base::zk_query_models::SxtNetwork, native::auth::get_access_token};
    use dotenv::dotenv;

    #[tokio::test]
    #[ignore]
    async fn test_get_zk_query_plan() {
        // Load environment variables from .env file, if available
        dotenv().ok();

        let root_url = Url::parse("https://api.makeinfinite.dev").expect("Invalid base URL");
        let auth_root_url = "https://proxy.api.makeinfinite.dev";
        let api_key =
            std::env::var("SXT_API_KEY").expect("SXT_API_KEY environment variable must be set");

        let access_token = get_access_token(&api_key, auth_root_url)
            .await
            .expect("Failed to get access token");

        let client = ZkQueryClient {
            base_url: root_url,
            client: Client::new(),
            access_token,
        };

        let queries = vec![
            "select block_number from ethereum.blocks limit 5",
            "select * from ethereum.blocks limit 5",
        ];

        for query in queries {
            let request = QueryPlanRequest {
                sql_text: query.to_string(),
                source_network: SxtNetwork::Mainnet,
                evm_compatible: true,
            };

            let result = client.get_zk_query_plan(request).await;
            assert!(result.is_ok(), "Query '{}' should succeed", query);
        }
    }
}
