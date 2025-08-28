#!/usr/bin/env bash
# 現状（状態）を1ファイルに集約：remotes / status / branch -vv / log / ツリー / テキスト全文
set -euo pipefail

mkdir -p logs
out="logs/snapshot_$(date +%Y%m%d_%H%M%S).txt"

# ==== exclude patterns ====
EXCLUDE_FILE="${SNAPSHOT_EXCLUDE_FILE:-scripts/snapshot.exclude}"

# 読み込み（コメントと空行を除去）
RAW_IGNORES=()
if [[ -f "$EXCLUDE_FILE" ]]; then
  mapfile -t RAW_IGNORES < <(sed -e 's/#.*$//' -e '/^\s*$/d' "$EXCLUDE_FILE")
fi

DIR_NAMES=()      # ディレクトリ名（どこにあっても一致）
GLOB_PATTERNS=()  # ファイル/ディレクトリのグロブ

for p in "${RAW_IGNORES[@]}"; do
  if [[ "$p" == */ ]]; then
    DIR_NAMES+=("${p%/}")
  elif [[ "$p" == *"*"* || "$p" == *"?"* || "$p" == *"["* ]]; then
    GLOB_PATTERNS+=("$p")
  else
    # 拡張子なしの素の名前は、ディレクトリ名にもファイル名にもなり得るので両方扱う
    DIR_NAMES+=("$p")
    GLOB_PATTERNS+=("$p")
  fi
done

# tree コマンド確認
if ! command -v tree >/dev/null 2>&1; then
  echo "'tree' が見つかりません。 sudo apt-get install -y tree を実行してください。" >&2
  exit 1
fi

{
  echo "===== Repo Snapshot ====="
  date -Iseconds | sed 's/^/Generated: /'
  pwd | sed 's/^/PWD: /'
  git --version 2>/dev/null | sed 's/^/Git: /'
  uname -a | sed 's/^/OS: /'
  [[ -f "$EXCLUDE_FILE" ]] && echo "Exclude file: $EXCLUDE_FILE"
  echo

  echo "■■■ Git Remotes ■■■"
  git remote -v 2>&1
  echo
  echo "■■■ Git Status ■■■"
  git status 2>&1
  echo
  echo "■■■ Git Branches (-vv) ■■■"
  git branch -vv 2>&1
  echo
  echo "■■■ Git Log (last 30, with author) ■■■"
  git log -n 30 --date=iso --pretty=format:'%h %ad %an <%ae> %d %s' 2>&1
  echo
  echo "----"
  echo

  echo "■■■ Directory Structure (filtered by scripts/snapshot.exclude) ■■■"
} > "$out"

# tree の除外パターン作成（| 連結）
TREE_PATTERNS=( "${DIR_NAMES[@]}" "${GLOB_PATTERNS[@]}" )
if [[ ${#TREE_PATTERNS[@]} -gt 0 ]]; then
  TREE_IGN=$(IFS='|'; printf '%s' "${TREE_PATTERNS[*]}")
  tree -a -I "$TREE_IGN" 2>/dev/null >> "$out"
else
  tree -a 2>/dev/null >> "$out"
fi

{
  echo
  echo "----"
  echo
  echo "■■■ File Contents (selected text files, FULL) ■■■"
} >> "$out"

# ---- ファイル走査：除外ディレクトリには潜らない（-prune） ----
PRUNE_EXPR=()
for d in "${DIR_NAMES[@]}"; do
  # ディレクトリ名一致を prune（どの階層でも効く）
  PRUNE_EXPR+=( -type d -name "$d" -prune -o )
done
for g in "${GLOB_PATTERNS[@]}"; do
  # グロブ一致は prune（ディレクトリ/ファイル両方に効く）
  PRUNE_EXPR+=( -name "$g" -prune -o )
done

# 出力ファイル自身やこのスクリプト類は除外
find . \( "${PRUNE_EXPR[@]}" -false \) -o -type f \
  -not -name "$(basename "$out")" \
  -not -path './scripts/snapshot.exclude' \
  -not -name 'repo_snapshot.sh' \
  -not -name 'repo_activity.sh' \
| while read -r f; do
    case "$f" in
      *.md|*.txt|*.json|*.yaml|*.yml|*.toml|*.ini|*.conf|*.html|*.css|*.js|*.ts|*.tsx|*.py|*.rb|*.go|*.rs|*.c|*.h|*.hpp|*.cpp|*.xml|*.sh|*.env.example)
        {
          echo
          echo "Directory: $(dirname "$f")"
          echo "File:      $(basename "$f")"
          echo "---------------------------------"
          cat -- "$f"            # ← 400行制限をやめて全文書き込み
          echo
          echo "----"
        } >> "$out"
        ;;
      *) : ;;  # それ以外の拡張子は無視（必要なら上のcaseに追加）
    esac
  done

echo "✅ Wrote $out"
