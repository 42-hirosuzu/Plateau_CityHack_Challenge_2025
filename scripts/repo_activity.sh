#!/usr/bin/env bash
# "誰が・いつ・何を・どれだけ" の活動を1ファイルに集約
# 例）./scripts/repo_activity.sh --since-days=120 --hotfiles-days=45 --limit-commits=80 --path server/
set -euo pipefail

SINCE_DAYS="${SINCE_DAYS:-90}"
HOTFILES_DAYS="${HOTFILES_DAYS:-30}"
LIMIT_COMMITS="${LIMIT_COMMITS:-50}"
PATH_FILTER="${PATH_FILTER:-}"
mkdir -p logs
OUT="logs/activity_$(date +%Y%m%d_%H%M%S).txt"

usage() {
  cat <<'USAGE'
repo_activity.sh
Options:
  --since-days=N       著者/行数の集計期間（日）。デフォルト: 90
  --hotfiles-days=N    ホットファイル抽出期間（日）。デフォルト: 30
  --limit-commits=N    直近コミットの表示件数。デフォルト: 50
  --path=PATHSPEC      分析対象を特定のパスに限定（例: server/ や src/*.ts）
  -h, --help           このヘルプを表示
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --since-days=*)    SINCE_DAYS="${1#*=}";;
    --hotfiles-days=*) HOTFILES_DAYS="${1#*=}";;
    --limit-commits=*) LIMIT_COMMITS="${1#*=}";;
    --path=*)          PATH_FILTER="${1#*=}";;
    -h|--help)         usage; exit 0;;
    *) echo "Unknown option: $1" >&2; usage; exit 1;;
  esac
  shift
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Gitリポジトリではありません。ルートで実行してください。" >&2
  exit 1
fi

declare -a PATHS=()
if [[ -n "$PATH_FILTER" ]]; then PATHS=("$PATH_FILTER"); fi
export LC_ALL=C

{
  echo "===== Repo Activity Report ====="
  date -Iseconds | sed 's/^/Generated: /'
  printf "PWD: %s\n" "$(pwd)"
  printf "Git: %s\n" "$(git --version 2>/dev/null || echo 'git not found')"
  echo

  echo "■■■ Recent Commits (who did what) ■■■"
  git log -n "$LIMIT_COMMITS" --date=iso \
    --pretty=format:'%h %ad %an <%ae> %d %s' -- "${PATHS[@]}" || true
  echo -e "\n----\n"

  echo "■■■ Contributors (last ${SINCE_DAYS} days, by commits) ■■■"
  git shortlog -sn --since="${SINCE_DAYS} days ago" -- "${PATHS[@]}" || true
  echo -e "\n----\n"

  echo "■■■ Lines changed per author (last ${SINCE_DAYS} days) ■■■"
  git log --since="${SINCE_DAYS} days ago" --numstat --format='%an' -- "${PATHS[@]}" \
  | awk 'NF==1 { a=$0; next } NF==3 { add[a]+=$1; del[a]+=$2; next }
         END { printf "%-25s %12s %12s %12s\n","Author","+added","-deleted","net(±)";
               for(n in add) printf "%-25s %12d %12d %12d\n",n,add[n],del[n],add[n]-del[n] }' \
  | sort -k2,2nr
  echo -e "\n----\n"

  echo "■■■ Hot Files (touched most in last ${HOTFILES_DAYS} days) ■■■"
  git log --since="${HOTFILES_DAYS} days ago" --name-only --pretty=format: -- "${PATHS[@]}" \
  | grep -v '^[[:space:]]*$' \
  | sort | uniq -c | sort -nr | head -n 20
  echo -e "\n----\n"

  echo "■■■ Last toucher for each hot file ■■■"
  mapfile -t HOTFILES < <(
    git log --since="${HOTFILES_DAYS} days ago" --name-only --pretty=format: -- "${PATHS[@]}" \
    | grep -v '^[[:space:]]*$' \
    | sort | uniq -c | sort -nr | head -n 20 \
    | awk '{ $1=""; sub(/^ +/,""); print }'
  )
  for f in "${HOTFILES[@]}"; do
    [[ -z "$f" ]] && continue
    printf "%s\n" "$f"
    git log -1 --date=iso --pretty=format:'  last: %h %ad %an <%ae> %d %s' -- "$f" || true
    echo
  done
  echo -e "\n----\n"
} > "$OUT"

echo "✅ Wrote $OUT"
