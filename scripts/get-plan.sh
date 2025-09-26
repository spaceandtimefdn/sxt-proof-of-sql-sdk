AUTH_ROOT_URL=$1
API_KEY=$2
PROVER_ROOT_URL=$3
QUERY=$4

SERIALIZED_TOKEN_RESPONSE=$(curl -s -X POST $AUTH_ROOT_URL/auth/apikey -H "apikey: $API_KEY")

ACCESS_TOKEN=$(echo "$SERIALIZED_TOKEN_RESPONSE" | jq -r '.accessToken')

SERIALIZED_PLAN_RESPONSE=$(curl -s -X POST $PROVER_ROOT_URL/v1/zkquery/build-plan \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"sqlText":"'"$QUERY"'", "sourceNetwork":"mainnet","evmCompatible":true}')

PLAN=$(echo "$SERIALIZED_PLAN_RESPONSE" | jq -r '.plan')

echo "Plan: $PLAN"