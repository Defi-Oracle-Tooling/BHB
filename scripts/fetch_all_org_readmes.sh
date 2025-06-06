#!/bin/zsh

#!/bin/zsh

# Prompt for PAT securely
read -s "GH_TOKEN?Enter your GitHub Classic PAT: "
export GH_TOKEN

# Get all orgs (logins) as an array
orgs=($(gh api user/orgs --jq '.[].login'))

for org in "${orgs[@]}"; do
  echo "Processing organization: $org"
  # Get all repo names for the org as an array
  repos=($(gh repo list "$org" --limit 1000 --json name -q '.[].name'))
  for repo in "${repos[@]}"; do
    echo "Fetching README for $org/$repo"
    gh api repos/"$org"/"$repo"/readme --accept raw > "${org}_${repo}_README.md" 2>/dev/null \
      && echo "Saved: ${org}_${repo}_README.md" \
      || echo "No README for $org/$repo"
  done
done