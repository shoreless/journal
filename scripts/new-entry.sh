#!/usr/bin/env bash
# Create today's journal entry: scripts/new-entry.sh "Title of experiment"
set -euo pipefail
cd "$(dirname "$0")/.."

title="${1:-Untitled experiment}"
date="${DATE:-$(date +%F)}"
slug=$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
file="_posts/${date}-${slug}.md"

if [[ -e "$file" ]]; then
  echo "Already exists: $file" >&2
  exit 1
fi

cat > "$file" <<ENTRY
---
title: "${title//\"/\\\"}"
date: ${date}
tags: []
tools: []
question: ""
verdict: ""
---

## What I tried

## What happened

## Takeaway
ENTRY

echo "$file"
