use super::{get_access_token, ZkQueryClient};
use crate::base::zk_query_models::{QueryPlanRequest, SxtNetwork};
use proof_of_sql::{base::try_standard_binary_deserialization, sql::evm_proof_plan::EVMProofPlan};
use reqwest::Client;
use url::Url;

/// Produces a plan given the API parameters and the query
///
/// This function uses the ZK Query API to build a proof plan
pub async fn produce_plan(
    root_url: Url,
    auth_root_url: Url,
    api_key: &str,
    query: &str,
    source_network: SxtNetwork,
) -> Result<EVMProofPlan, Box<dyn core::error::Error>> {
    // Get access token
    let access_token = get_access_token(api_key, auth_root_url.as_str()).await?;

    // Create ZkQueryClient
    let client = ZkQueryClient {
        base_url: root_url.clone(),
        client: Client::new(),
        access_token,
    };

    // Create request
    let request = QueryPlanRequest {
        sql_text: query.to_string(),
        source_network,
        evm_compatible: true,
    };

    // Get plan from API
    let response = client.get_zk_query_plan(request).await?;

    // Deserialize the plan

    let plan_bytes = hex::decode(response.plan.trim_start_matches("0x"))?;

    let plan: EVMProofPlan = try_standard_binary_deserialization(&plan_bytes)?.0;

    Ok(plan)
}
