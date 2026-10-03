#!/usr/bin/env bash
# Run the whole guideline RAG pipeline end to end, then verify the result.
#
#   PDF -> data/_work/extract/*.jsonl      (pdf_extract.py)
#       -> data/guidelines/**/*.md         (build_guidelines.py)
#       -> knowledge_documents/chunks      (app.knowledge.ingest_guidelines)
#       -> pass/fail report                (verify_guidelines.py)
#
# Every stage is idempotent, so re-running this after adding a PDF or editing a
# profile only rewrites what changed. The script exits non-zero if any stage
# fails, so it is safe to wire into CI.
#
# Usage
#   scripts/run_guidelines_pipeline.sh            # full run
#   scripts/run_guidelines_pipeline.sh --verify   # verify an existing ingest
#   scripts/run_guidelines_pipeline.sh --no-verify
#
# Lifespan:
#   Stable tooling. Add one entry to SOURCES per new source PDF.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PY="${PY:-.venv/bin/python}"

# slug : PDF filename inside <repo>/docs/rag_docs
SOURCES=(
  "postpartum_diet:014-2022+产褥期妇女膳食指导.pdf"
  "complementary_feeding:婴幼儿辅食添加营养指南.pdf"
  "cuiyutao_natural_parenting:崔玉涛自然养育法.pdf"
)

RUN_PIPELINE=1
RUN_VERIFY=1
for arg in "$@"; do
  case "$arg" in
    --verify) RUN_PIPELINE=0 ;;
    --no-verify) RUN_VERIFY=0 ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [[ ! -x "$PY" ]]; then
  echo "Python interpreter not found at $PY (set PY=/path/to/python)" >&2
  exit 1
fi

RAG_DOCS="$("$PY" -c 'import sys; sys.path.insert(0, "scripts"); from rag_paths import rag_docs_dir; print(rag_docs_dir())')"
WORK_DIR="$(dirname "$0")/../data/_work"

stage() { printf '\n=== %s ===\n' "$*"; }

if [[ "$RUN_PIPELINE" == 1 ]]; then
  # Preflight: fail before touching the database if a source PDF is missing.
  missing=0
  for entry in "${SOURCES[@]}"; do
    pdf="$RAG_DOCS/${entry#*:}"
    if [[ ! -f "$pdf" ]]; then
      echo "missing source PDF: $pdf" >&2
      missing=1
    fi
  done
  [[ "$missing" == 0 ]] || { echo "Aborting: source PDFs are incomplete." >&2; exit 1; }

  stage "1/4 extract PDFs -> JSONL"
  for entry in "${SOURCES[@]}"; do
    slug="${entry%%:*}"
    pdf="$RAG_DOCS/${entry#*:}"
    echo "--- $slug"
    "$PY" scripts/pdf_extract.py \
      --pdf "$pdf" \
      --out "$WORK_DIR/extract/$slug.jsonl" \
      > "$WORK_DIR/extract/$slug.report.json"
    "$PY" -c 'import json,sys; r=json.load(open(sys.argv[1])); print(json.dumps(r, ensure_ascii=False))' \
      "$WORK_DIR/extract/$slug.report.json"
  done

  stage "2/4 build structured Markdown"
  "$PY" scripts/build_guidelines.py

  stage "3/4 ingest into the knowledge base"
  "$PY" -m app.knowledge.ingest_guidelines
else
  stage "skipping pipeline (--verify)"
fi

if [[ "$RUN_VERIFY" == 1 ]]; then
  stage "4/4 verify"
  "$PY" scripts/verify_guidelines.py
else
  stage "skipping verification (--no-verify)"
fi

printf '\nPipeline complete.\n'
