# リポ運用ツール仕様（repo_snapshot.sh / repo_activity.sh）— 現行版
# リポ運用ツール仕様（repo\_snapshot.sh / repo\_activity.sh）— 現行版

この文書は、`scripts/repo_snapshot.sh` と `scripts/repo_activity.sh` の **目的・使い方・出力・注意点** をまとめた「運用仕様書」です。
**除外設定は `scripts/snapshot.exclude` に外出し**され、\*\*テキストは“先頭400行ではなく全文”\*\*を書き出します。
（実行ログの先頭付近に `Exclude file: scripts/snapshot.exclude` と記録されます）

---

## 1. 目的

* **repo\_snapshot.sh**
  リポの “いまこの瞬間” を 1 ファイルに集約。

  * Git情報：`remote / status / branch -vv / 直近30コミット`（著者・日時・件名つき）
  * ディレクトリツリー（`tree`、除外は外部ファイルで管理）
  * **テキスト系ファイルの** **全文ダンプ**（拡張子フィルタあり）
* **repo\_activity.sh**
  「**誰が・いつ・何を・どれだけ**」のアクティビティ可視化。

  * 直近コミット一覧
  * 期間内の貢献者ランキング（コミット数）
  * 著者別 追加/削除行数・Net
  * “ホットファイル” とその最終更新者

> 出力は **Git管理外の `logs/`** に保存されます（`.gitignore` 済）。

---

## 2. 前提・依存

* OS: Linux / WSL2（bash）
* 必須: `git`
* **snapshotのみ**: `tree`（無い場合は `sudo apt-get install -y tree`）

---

## 3. ファイル構成（関係するものだけ）

```
scripts/
  ├─ repo_snapshot.sh       # 現状スナップショット
  ├─ repo_activity.sh       # 活動レポート
  └─ snapshot.exclude       # ← 除外リスト（本ファイルで管理）
logs/
  ├─ snapshots/ snapshot_YYYYmmdd_HHMMSS.txt
  └─ activity/  activity_YYYYmmdd_HHMMSS.txt
```

> 実行時スナップショットの先頭に **Exclude file: scripts/snapshot.exclude** が出力されます。

---

## 4. 使い方（クイック）

### 4.1 現状スナップショット

```bash
# 実行
scripts/repo_snapshot.sh

# 直近の出力ファイルを確認
ls -1 logs/snapshots | tail -n1 | sed 's|^|logs/snapshots/|'
```

### 4.2 活動レポート

```bash
scripts/repo_activity.sh
ls -1 logs/activity | tail -n1 | sed 's|^|logs/activity/|'
```

> **WSL の /mnt/c などが noexec の場合**は `bash scripts/…` で実行してください。

---

## 5. 除外設定（`scripts/snapshot.exclude`）

* 空行と `#` はコメントとして無視
* **行末が `/`** … ディレクトリ名として除外（任意の階層にマッチ）
* `*` / `?` / `[]` を含む行 … **グロブ** として除外（ファイル/ディレクトリ両方に効く）
* 単なる名前 … ディレクトリ名・ファイル名の両方にマッチ

**例（初期値の一部）**：

```text
# --- directories (anywhere) ---
.git/
node_modules/
dist/
build/
.next/
.cache/
.venv/
.idea/
logs/
Binaries/
DerivedDataCache/
Intermediate/
Saved/

# --- file globs ---
*.png
*.jpg
*.jpeg
*.mp4
*.mov
*.uasset
*.umap
.env
.env.*
```

> 一時的に別の除外ファイルを使う：
> `SNAPSHOT_EXCLUDE_FILE=/path/to/other.exclude scripts/repo_snapshot.sh`

---

## 6. 出力仕様

### 6.1 snapshot 出力（例）

* 先頭セクションに **Git Remotes / Status / Branches / Log(30)** を列挙（著者・日時つき）。
* `Directory Structure (filtered…)` に **除外適用済ツリー**を表示。
* `File Contents (… FULL)` に **対象テキストの全文**を **ファイルごとに** `Directory:` / `File:` 見出しつきで追記。

### 6.2 activity 出力（例）

* Recent Commits（件数は `--limit-commits`）
* Contributors（`--since-days` 期間の shortlog）
* Lines changed per author（`--since-days` 期間の +/−/net）
* Hot Files（`--hotfiles-days` 期間で触られた回数上位 & 最終更新者）

---

## 7. repo\_activity.sh の主なオプション

```bash
# 期間を延長（例：著者/行数120日・ホット45日・直近80コミット表示）
scripts/repo_activity.sh --since-days=120 --hotfiles-days=45 --limit-commits=80

# パスで絞る（例：server/ 配下のみ）
scripts/repo_activity.sh --path=server/ --since-days=60
```

* `--since-days=N` … 著者/行数の集計期間（日）デフォルト 90
* `--hotfiles-days=N` … ホットファイル抽出期間（日）デフォルト 30
* `--limit-commits=N` … 直近コミットの表示件数 デフォルト 50
* `--path=PATHSPEC` … 解析対象をパスで限定（`server/` や `src/*.ts` など）

---

## 8. 運用ルール

* **禁止**：`server/` と `index.html` の変更、`.git` の直接編集
* **推奨**：PR前後に `repo_activity.sh` を回し、差分の粒度や影響範囲を把握
* **成果物**：`logs/` 配下はコミットしない（`.gitignore` 済）
* **スクリプト改修**：変更は PR で。コメントは厚めに。

---

## 9. トラブルシュート

* `Permission denied`

  * 実行権なし → `chmod +x scripts/*.sh`
  * **WSL `/mnt/c` が noexec** → `bash scripts/…` で実行
* `'tree' が見つかりません` → `sudo apt-get install -y tree`
* `Gitリポジトリではありません` → リポの **ルート** で実行
* **巨大/バイナリが混じる** → `scripts/snapshot.exclude` に拡張子やディレクトリを追加

---

## 10. 参考：直近スナップショットの実例

* `Exclude file: scripts/snapshot.exclude` が記録され、
* `Git Status` に変更中の `README.md` と未追跡ファイルが表示、
* `Directory Structure (filtered…)` に現在のツリーが出力されています。

