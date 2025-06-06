#!/bin/bash
set -euo pipefail

# Load .env file for GITHUB_TOKEN (the Classic PAT Token).
if [ -f .env ]; then
    while IFS='=' read -r key value; do
        [ -n "$key" ] && export "$key"="$value"
    done < <(grep -v '^#' .env)
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "GITHUB_TOKEN is not set. Please set it in your .env file."
    exit 1
fi

BASE_OUTPUT_DIR="readmes"
mkdir -p "$BASE_OUTPUT_DIR"

echo "Fetching enterprises..."
# Get enterprises for the user
ENTREPRISES=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/user/enterprises")
enterprise_count=$(echo "$ENTREPRISES" | jq 'length')
if [ "$enterprise_count" -eq 0 ]; then
    echo "No enterprises found."
    exit 0
fi

# Iterate through each enterprise
for row in $(echo "$ENTREPRISES" | jq -r '.[] | @base64'); do
    _jq() {
        echo "${row}" | base64 --decode | jq -r ${1}
    }
    enterprise_slug=$(_jq '.slug')
    echo "Enterprise: $enterprise_slug"
    
    enterprise_folder="$BASE_OUTPUT_DIR/$enterprise_slug"
    mkdir -p "$enterprise_folder"

    echo "  Fetching organizations for enterprise $enterprise_slug..."
    ORGS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/enterprises/${enterprise_slug}/organizations")
    org_count=$(echo "$ORGS" | jq 'length')
    if [ "$org_count" -eq 0 ]; then
        echo "  No organizations found for enterprise $enterprise_slug."
        continue
    fi

    # Iterate through each organization
    for org in $(echo "$ORGS" | jq -r '.[] | @base64'); do
        _jq_org() {
            echo "${org}" | base64 --decode | jq -r ${1}
        }
        org_login=$(_jq_org '.login')
        echo "    Organization: $org_login"
        
        org_folder="$enterprise_folder/$org_login"
        mkdir -p "$org_folder"

        echo "      Fetching repositories for organization $org_login..."
        REPOS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/orgs/${org_login}/repos?per_page=100")
        repo_count=$(echo "$REPOS" | jq 'length')
        if [ "$repo_count" -eq 0 ]; then
            echo "      No repositories found for organization $org_login."
            continue
        fi

        # Iterate through each repository
        for repo in $(echo "$REPOS" | jq -r '.[] | @base64'); do
            _jq_repo() {
                echo "${repo}" | base64 --decode | jq -r ${1}
            }
            repo_name=$(_jq_repo '.name')
            echo "        Fetching README for repository $repo_name..."

            README_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/${org_login}/${repo_name}/readme")
            message=$(echo "$README_RESPONSE" | jq -r '.message')
            if [ "$message" == "Not Found" ]; then
                echo "          README not found for $repo_name"
                continue
            fi

            encoding=$(echo "$README_RESPONSE" | jq -r '.encoding')
            if [ "$encoding" != "base64" ]; then
                echo "          Unsupported encoding for $repo_name: $encoding"
                continue
            fi

            content=$(echo "$README_RESPONSE" | jq -r '.content' | tr -d '\n')
            echo "$content" | base64 --decode > "$org_folder/${repo_name}_README.md"
            echo "          Saved README for $repo_name"
        done
    done
done

echo "Done."