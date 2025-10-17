//! Client for interacting with the ZK Query APIs
use crate::base::zk_query_models::{
    QueryPlanRequest, QueryPlanResponse, QueryResultsResponse, QueryStatusResponse,
    QuerySubmitRequest, QuerySubmitResponse, ZkQueryStatus,
};
use reqwest::Client;
use std::{future::Future, pin::Pin};
use url::Url;

const INITIAL_MILLISECONDS_TO_RETRY: u64 = 10;
const MAX_MILLISECONDS_TO_RETRY: u64 = 1_800_000;

/// Struct for interacting with the ZK Query APIs
#[derive(Debug, Clone)]
pub struct ZkQueryClient {
    /// Base URL for the ZK Query API
    pub base_url: Url,
    /// HTTP client for making requests
    pub client: Client,
    /// Access token for authentication, obtained using the API key
    pub access_token: String,
}

impl ZkQueryClient {
    /// Submits a request for a zk query
    async fn submit_zk_query(
        &self,
        request: QuerySubmitRequest,
    ) -> Result<QuerySubmitResponse, Box<dyn core::error::Error>> {
        let response = self
            .client
            .post(self.base_url.join("/v1/zkquery")?)
            .bearer_auth(&self.access_token)
            .json(&request)
            .send()
            .await?
            .error_for_status()?;
        Ok(response
            .json::<QuerySubmitResponse>()
            .await
            .map_err(|e| format!("Failed to parse query submit response: {}", &e))?)
    }

    /// Retrieves the status of a zk query
    async fn poll_zk_query_status(
        &self,
        query_id: String,
    ) -> Result<QueryStatusResponse, Box<dyn core::error::Error>> {
        let response = self
            .client
            .get(
                self.base_url
                    .join(&format!("/v1/zkquery/{}/status", &query_id))?,
            )
            .bearer_auth(&self.access_token)
            .send()
            .await?
            .error_for_status()?;
        Ok(response
            .json::<QueryStatusResponse>()
            .await
            .map_err(|e| format!("Failed to parse query status response: {}", &e))?)
    }

    /// Retrieves the results of a completed zk query
    async fn get_zk_query_results(
        &self,
        query_id: String,
    ) -> Result<QueryResultsResponse, Box<dyn core::error::Error>> {
        let response = self
            .client
            .get(
                self.base_url
                    .join(&format!("/v1/zkquery/{}/results", &query_id))?,
            )
            .bearer_auth(&self.access_token)
            .send()
            .await?
            .error_for_status()?;
        Ok(response
            .json::<QueryResultsResponse>()
            .await
            .map_err(|e| format!("Failed to parse query results response: {}", &e))?)
    }

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

    /// Orchestrates retry logic on polling the status of a zk query.
    #[expect(clippy::type_complexity)]
    fn wait_for_completed_status<'a>(
        &'a self,
        query_id: &'a String,
        milliseconds_to_retry: u64,
    ) -> Pin<Box<dyn Future<Output = Result<ZkQueryStatus, Box<dyn core::error::Error>>> + 'a>>
    {
        Box::pin(async move {
            let status = self.poll_zk_query_status(query_id.clone()).await?.status;
            match status {
                ZkQueryStatus::Done | ZkQueryStatus::Canceled | ZkQueryStatus::Failed => Ok(status),
                _ => {
                    tokio::time::sleep(tokio::time::Duration::from_millis(milliseconds_to_retry))
                        .await;
                    let new_milliseconds_to_retry =
                        if milliseconds_to_retry <= MAX_MILLISECONDS_TO_RETRY / 2 {
                            2 * milliseconds_to_retry
                        } else {
                            MAX_MILLISECONDS_TO_RETRY
                        };
                    self.wait_for_completed_status(query_id, new_milliseconds_to_retry)
                        .await
                }
            }
        })
    }

    /// Orchestrates the API requests that are need to run a zk query
    pub async fn run_zk_query(
        &self,
        request: QuerySubmitRequest,
    ) -> Result<QueryResultsResponse, Box<dyn core::error::Error>> {
        let query_submit_response = self.submit_zk_query(request).await?;
        let query_id = query_submit_response.query_id.to_string();
        let status = self
            .wait_for_completed_status(&query_id, INITIAL_MILLISECONDS_TO_RETRY)
            .await?;
        if status == ZkQueryStatus::Done {
            Ok(self.get_zk_query_results(query_id).await?)
        } else {
            Err(format!("Final status for query: {:?}", status).into())
        }
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

    #[tokio::test]
    #[ignore]
    async fn test_get_zk_query_proof() {
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

        let query = "SELECT BLOCK_NUMBER FROM ETHEREUM.BLOCKS WHERE BLOCK_NUMBER=22419300";
        let request = QuerySubmitRequest {
            sql_text: query.to_string(),
            source_network: SxtNetwork::Mainnet,
            timeout: None,
            commitment_scheme: Some(crate::base::prover::CommitmentScheme::HyperKzg),
            block_hash: None,
        };

        let result = client.run_zk_query(request).await;
        assert!(result.is_ok(), "Query '{}' should succeed", query);
    }
}
