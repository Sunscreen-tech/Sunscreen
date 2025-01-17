#! /bin/bash

gh auth status

if [ $? -ne 0 ]; then
    gh auth login
fi

actions=$(gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/sunscreen-tech/sunscreen/actions/caches | jq '.actions_caches | .[] | .id')

for i in $actions; do
    echo "Deleting cache id " $i
    gh api --method DELETE -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/sunscreen-tech/sunscreen/actions/caches/$i
done

