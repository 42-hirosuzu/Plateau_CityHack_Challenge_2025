# ようこそ

## PBRオブジェクトURL発行までの手順
１：server, my-inworld-ai, my-orchestratorそれぞれのディレクトリで```pnpm install```を実行し、依存関係をインストールする

２：それぞれで```pnpm run dev```を実行し、listen状態にする。(起動順序はserver->in-world->orchestrator)

３：4つ目のターミナルで、
```
curl -X POST http://localhost:3001/generate-model   -H "Content-Type: application/json"   -d "{\"keyword\":\"I want to create a magical fairytale kingdom in Urayasu, Chiba, but the main castle cannot be taller than 51 meters and the style must be welcoming to families.\"}"
```
を、実行。（keywordの部分はカスタマイズ可能。こんな世界を作りたい。と指令を出す。）

４：my-orchestratorに、複数のPBRオブジェクトURLが出力される。

<img width="3839" height="2155" alt="スクリーンショット 2025-08-31 150300" src="https://github.com/user-attachments/assets/83465159-e18b-4f97-a556-300201d9f4b4" />

参考動画：
https://youtu.be/ptawkLrc2Qs


## meshy3Dコンテンツを作るためのサーバー準備（server）
０：pnpmつかえないならいれる

１：依存インストール
pnpm install --frozen-lockfile


２：環境変数（APIキーとか）のために.envをserverフォルダにつくる

３：pnpm run dev

```
# 起動（開発）
pnpm dev
# 生成ジョブ開始
curl -s -X POST "http://localhost:3000/api/3Dcontents" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"魅力的な形をした本棚"}'
# => {"jobId":"..."}
# ステータス確認（ready で url が付く）
curl -s "http://localhost:3000/api/jobs/<jobId>"
```

## 生成の仕方(server)
#ローカルサーバAPIを叩いて３Dコンテンツを生成する方法
（ただし、生成にはクレジット消費してるからテストなら後述のURLから.glbを使用してくれい！）

１：ローカルでサーバを起動する（POST GETを待っている）
２：他から、
```
curl -s -X POST "http://localhost:3000/api/3Dcontents" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"魅力的な形をした本棚"}'
```

こうすると、生成開始されてJOBキューにのっかる
JOBIDが即座に返される

３：```curl -s "http://localhost:3000/api/jobs/<jobId>"```
ここにさっき作ったIDをいれれば、
```
{"id":"9f4ad4fa-8261-428b-a03d-16a786680195","status":"queued"}
```

こんなのがかえってくる
叩き続ければいずれstatusが変わってurlを取得できる
後述のテスト用のGLBダウンロードURLは、

GLB URL: https://assets.meshy.ai/54143a53-6708-4685-b0e4-705d1f6846ca/tasks/0198ea5d-1cd8-78c9-8642-2dd7beabcb7e/output/model.glb?Expires=4909852800&Signature=DQf7WOH7J~v~IdCitvr67c2Z4PB5VQxQQaNp4yMgj5ux9-49VJ9DnBveoVxxeJZHuRI31dShUARz0Dy7Ifc6ThGWbzcNPrd8MI24R2vGid5oAsW3lbrs7QOflsj0XXXLOyUap2lUgyva24EijgO6cvo55aYD1P2X7zjIKU-itxFPemFklZs6P~0DK5ZP0gWtySJh0~M~kQmTL3q94Bn0CJuRJEmBRmskE--TgvtH~qEuj~VGfDV5WZRIrL9FT1GKW6ywHpGmw50R7A96CI94GjcSoJGk8RrJyYqMPbcVF5D-qlqli1J4sfLDaWt4bmf78KuRe0JayGMmdgA6P5YKaQ__&Key-Pair-Id=KL5I0C8H7HX83


これ# note

---

## 開発者向けツール（Repo Tools）

リポの現状/履歴を採取するスクリプトを用意しています（**`server/`・`index.html`・`.git` は変更しません**）。

- 現状スナップショット  
  ```bash
  scripts/repo_snapshot.sh
  ls -1 logs/snapshots | tail -n1 | sed 's|^|logs/snapshots/|'
  ```
- 活動レポート  
  ```bash
  scripts/repo_activity.sh
  ls -1 logs/activity | tail -n1 | sed 's|^|logs/activity/|'
  ```

詳細：[`docs/repo-tools.md`](docs/repo-tools.md)
