# Contributing Guide (Git ルール)

このプロジェクトの Git 運用ルールです。概要は README、本文はここに集約します。

## ブランチ戦略（Git-Flow ライト）
- `main`：リリース用。**直接push禁止**（PR経由、Squash推奨）
- `develop`：日々の統合先。**feature → develop にPR**
- `feature/*`：作業用（例: `feature/hirosuzu-setup`）

## ブランチ命名
- `feature/<作業者|-トピック>` 例: `feature/hirosuzu-orchestrator`
- `fix/<内容>`、`chore/<内容>`、`docs/<内容>` などもOK

## コミット規約
- タイプ: `feat|fix|docs|chore|refactor|perf|test|ci|build|revert`
- 例: `feat: add orchestrator /ingest endpoint`

## PR ルール
- **base: `develop` / compare: `feature/*`**
- タイトル: 目的がわかる短文（例: `feat: repo tooling + orchestrator scaffold`）
- 説明: PRテンプレに沿って「概要/変更点/動作確認/影響」
- Draft（WIP）歓迎。レビュー依頼は Ready にしてから
- **CI 成功必須**、**レビュワ1人以上必須**
- **Merge 方法は Squash**（履歴をきれいに）

## 同期の仕方（rebase or merge）
- 最新 `develop` を取り込みたいとき：
  ```bash
  git fetch origin
  git switch <feature-branch>
  # rebase の場合（履歴を直線に保つ）
  git rebase origin/develop
  # 競合解決→テスト→push（必要なら --force-with-lease）
  # もしくは merge の場合：
  # git merge origin/develop
共有ブランチ（develop/main）での force-push は禁止

## リリース
- develop → main を PR でマージ（Squash）

## 今の feature を最新に保ちたい
  ```bash
  git fetch origin
  git switch feat/xyz
  git rebase origin/develop   # or: git merge origin/develop
  git push --force-with-lease # rebase のときだけ
  ```

## 新しい feature を切る
  ```bash
git switch develop
git pull origin develop
git switch -c feat/new-task
git push -u origin HEAD
```
## rebase を間違えた／やめたい
  ```bash
git rebase --abort
```