#!/bin/sh
set -eu
ROOT=/opt/challengegoal
mkdir -p "$ROOT/backups"
sqlite3 "$ROOT/data/sportapps.sqlite" ".backup '$ROOT/backups/sportapps-$(date +%F).sqlite'"
gzip -f "$ROOT/backups/sportapps-$(date +%F).sqlite"
find "$ROOT/backups" -name 'sportapps-*.sqlite.gz' -mtime +14 -delete
