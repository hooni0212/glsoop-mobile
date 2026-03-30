#!/bin/sh

set -eu

echo "# Android Production Build Context"
echo "generated_at_utc=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "cwd=$(pwd)"
echo "branch=$(git branch --show-current)"
echo "head=$(git rev-parse HEAD)"
echo
echo "## git status --short"
git status --short
echo
echo "## git diff --stat"
git diff --stat
