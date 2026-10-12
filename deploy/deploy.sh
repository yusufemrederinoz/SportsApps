#!/bin/sh
set -eu
HOST="${DEPLOY_HOST:-root@37.60.248.54}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/challengegoal_ed25519}"
ROOT=/opt/challengegoal
DATA=$ROOT/data/football
BUNDLED=app/assets/data
REPO="$(git rev-parse --show-toplevel)"
REMOTE="ssh -i $KEY -o BatchMode=yes $HOST"

if [ "${1:-}" = "data" ]; then
  $REMOTE "rm -rf $DATA.incoming && mkdir -p $DATA.incoming"
  git -C "$REPO" -c core.autocrlf=false archive HEAD $BUNDLED/football.db $BUNDLED/version.json | $REMOTE "tar -x --strip-components=3 -C $DATA.incoming"
  $REMOTE "mkdir -p $DATA && mv -f $DATA.incoming/football.db $DATA.incoming/version.json $DATA/ && rmdir $DATA.incoming && chown -R 1000:1000 $DATA && cat $DATA/version.json && cd $ROOT && docker compose restart api && docker compose ps"
  exit 0
fi

$REMOTE "mkdir -p $ROOT/data/portraits $DATA $ROOT/backups $ROOT/site $ROOT/secrets && if [ ! -f $DATA/football.db ] && [ -f $ROOT/source/$BUNDLED/football.db ]; then cp $ROOT/source/$BUNDLED/football.db $ROOT/source/$BUNDLED/version.json $DATA/; fi && rm -rf $ROOT/source && mkdir -p $ROOT/source && chown -R 1000:1000 $ROOT/data"
git -C "$REPO" -c core.autocrlf=false archive HEAD | $REMOTE "tar -x -C $ROOT/source"
tar -C "$REPO/deploy" -c compose.yaml Caddyfile backup.sh site | $REMOTE "tar -x -C $ROOT && chmod +x $ROOT/backup.sh"
if [ "${1:-}" = "portraits" ]; then
  tar -C "$REPO/data/build/portraits" -c . | $REMOTE "tar -x -C $ROOT/data/portraits && chown -R 1000:1000 $ROOT/data/portraits"
fi
$REMOTE "cd $ROOT && touch .env && docker compose up -d --build && docker compose restart caddy && docker compose ps"
