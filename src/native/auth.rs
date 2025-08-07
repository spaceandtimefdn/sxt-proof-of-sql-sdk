use reqwest::Client;
/// Get access token from the API key
///
/// To obtain an API key please visit [Space and Time Studio](https://app.spaceandtime.ai/) and create an account.
/// See [Get API Key Using Space and Time Studio](https://docs.spaceandtime.io/docs/using-studioapi-key) for more information.
#[allow(dead_code)]
pub async fn get_access_token(
    apikey: &str,
    url: &str,
) -> Result<String, Box<dyn core::error::Error>> {
    let client = Client::new();
    let auth_url = format!("{}/auth/apikey", url);
    let response = client
        .post(auth_url)
        .header("apikey", apikey)
        .send()
        .await?;
    let response_json = response.json::<serde_json::Value>().await?;
    let access_token = response_json["accessToken"]
        .as_str()
        .ok_or("No access token")?;
    Ok(access_token.to_string())
}
