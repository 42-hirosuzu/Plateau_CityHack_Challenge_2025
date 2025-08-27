# ようこそ

## meshy3Dコンテンツを作るためのサーバー準備
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

## 生成の仕方
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
