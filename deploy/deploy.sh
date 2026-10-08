#!/bin/sh
set -eu
HOST="${DEPLOY_HOST:-root@37.60.248.54}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/challengegoal_ed25519}"
ROOT=/opt/challengegoal
REPO="$(git rev-parse --show-toplevel)"
REMOTE="ssh -i $KEY -o BatchMode=yes $HOST"

$REMOTE "mkdir -p $ROOT/data/portraits $ROOT/backups $ROOT/site $ROOT/secrets && rm -rf $ROOT/source && mkdir -p $ROOT/source && chown -R 1000:1000 $ROOT/data"
git -C "$REPO" -c core.autocrlf=false archive HEAD | $REMOTE "tar -x -C $ROOT/source"
tar -C "$REPO/deploy" -c compose.yaml Caddyfile backup.sh site | $REMOTE "tar -x -C $ROOT && chmod +x $ROOT/backup.sh"
if [ "${1:-}" = "portraits" ]; then
  tar -C "$REPO/data/build/portraits" -c . | $REMOTE "tar -x -C $ROOT/data/portraits && chown -R 1000:1000 $ROOT/data/portraits"
fi
$REMOTE "cd $ROOT && touch .env && docker compose up -d --build && docker compose restart caddy && docker compose ps"
