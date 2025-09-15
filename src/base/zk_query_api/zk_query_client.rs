use super::models::{QueryPlanRequest, QueryPlanResponse, QuerySubmitRequest, QuerySubmitResponse};
use crate::base::zk_query_api::models::{QueryResultsResponse, QueryStatusResponse, ZkQueryStatus};
use reqwest::Client;
use std::{future::Future, pin::Pin};

const INITIAL_MILLISECONDS_TO_RETRY: u64 = 10;
const MAX_MILLISECONDS_TO_RETRY: u64 = 1_800_000;

/// Struct for interacting with the ZK Query APIs
pub struct ZkQueryClient {
    pub base_url: String,
    pub client: Client,
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
            .post(format!("{}/v1/zkquery", &self.base_url))
            .bearer_auth(&self.access_token)
            .json(&request)
            .send()
            .await?
            .error_for_status()?;
        let serialized_response = response.text().await?;
        Ok(
            serde_json::from_str::<QuerySubmitResponse>(&serialized_response).map_err(|_e| {
                format!("Failed to parse prover response: {}", &serialized_response)
            })?,
        )
    }

    /// Retrieves the status of a zk query
    async fn poll_zk_query_status(
        &self,
        query_id: String,
    ) -> Result<QueryStatusResponse, Box<dyn core::error::Error>> {
        let response = self
            .client
            .get(format!("{}/v1/zkquery/{}/status", &self.base_url, query_id))
            .bearer_auth(&self.access_token)
            .send()
            .await?
            .error_for_status()?;
        let serialized_response = response.text().await?;
        Ok(
            serde_json::from_str::<QueryStatusResponse>(&serialized_response).map_err(|_e| {
                format!(
                    "Failed to parse query status response: {}",
                    &serialized_response
                )
            })?,
        )
    }

    /// Retrieves the results of a completed zk query
    async fn get_zk_query_results(
        &self,
        query_id: String,
    ) -> Result<QueryResultsResponse, Box<dyn core::error::Error>> {
        let response = self
            .client
            .get(format!(
                "{}/v1/zkquery/{}/results",
                &self.base_url, query_id
            ))
            .bearer_auth(&self.access_token)
            .send()
            .await?
            .error_for_status()?;
        let serialized_response = response.text().await?;
        Ok(
            serde_json::from_str::<QueryResultsResponse>(&serialized_response).map_err(|_e| {
                format!(
                    "Failed to parse query status response: {}",
                    &serialized_response
                )
            })?,
        )
    }

    /// Requests a proof plan from the ZK Query API.
    pub async fn get_zk_query_plan(
        &self,
        request: QueryPlanRequest,
    ) -> Result<QueryPlanResponse, Box<dyn core::error::Error>> {
        let response = self
            .client
            .post(format!("{}/v1/zkquery/build-plan", &self.base_url))
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
    fn determine_status<'a>(
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
                    self.determine_status(query_id, new_milliseconds_to_retry)
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
            .determine_status(&query_id, INITIAL_MILLISECONDS_TO_RETRY)
            .await?;
        if status == ZkQueryStatus::Done {
            Ok(self.get_zk_query_results(query_id).await?)
        } else {
            Err(format!("Final status for query: {:?}", status).into())
        }
    }
}
