#!/bin/zsh
set -e

cd /Users/phamthanh/Desktop/Project/learn-french/alice-teaching-land

export CLAMAV_HOST=127.0.0.1
export CLAMAV_PORT=3310

exec /opt/homebrew/bin/node \
  --conditions=react-server \
  --env-file=.env \
  --env-file=.env.local \
  --import tsx \
  scripts/material-scan-worker.ts
