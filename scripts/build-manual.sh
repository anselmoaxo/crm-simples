#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="pandoc/latex@sha256:1cf54d9214a9b52de2f58cf5895cc596a5960711a54d7938dc72f2b23473caf3"

docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --env SOURCE_DATE_EPOCH=946684800 \
  --volume "$ROOT_DIR:/data" \
  --workdir /data \
  "$IMAGE" \
  docs/manual-operacional.md \
  --from=markdown \
  --pdf-engine=xelatex \
  --toc \
  --number-sections \
  --resource-path=/data \
  --variable geometry:margin=18mm \
  --variable colorlinks=true \
  --output docs/manual-operacional.pdf

cd "$ROOT_DIR"
sha256sum docs/manual-operacional.pdf > docs/manual-operacional.pdf.sha256
