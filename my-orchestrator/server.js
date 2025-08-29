// 必要なライブラリを読み込みます
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// --- ミドルウェアの設定 ---
app.use(cors()); // CORSを許可します
app.use(express.json()); // JSON形式のリクエストボディを解析します

// --- 連携先サーバーの設定 ---
const MODEL_SERVER_URL = 'http://localhost:3000'; // /server のアドレス

// --- ユーティリティ関数 ---
// 指定した時間待機するための関数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- エンドポイントの定義 ---

/**
 * サーバーの動作確認用エンドポイント
 */
app.get('/ping', (req, res) => {
  res.json({ ok: true, message: 'Orchestrator is running!' });
});

/**
 * Unityからのリクエストを受け、モデル生成の全工程を管理するエンドポイント
 */
app.post('/generate-model', async (req, res) => {
  console.log('--- Received request on /generate-model ---');

  // 最終的にはInworld AIがこのプロンプトを生成します
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // --- STEP 1: /serverにモデル生成をリクエスト ---
    console.log(`Sending prompt to model server: "${prompt}"`);
    const createResponse = await axios.post(`${MODEL_SERVER_URL}/api/3Dcontents`, {
        prompt: prompt,
    });

    const taskId = createResponse.data.jobId;
    console.log(`Task created with ID: ${taskId}`);

    // Unity側には、まずタスクが開始したことを伝える
    res.status(202).json({ message: 'Model generation started.', taskId: taskId });


    // --- STEP 2: モデルが完成するまで/serverに問い合わせを続ける (非同期処理) ---
    // (レスポンスを返した後に、裏側で処理を続けます)
    pollForModel(taskId);

  } catch (error) {
    console.error('Error starting model generation:', error.response ? error.response.data : error.message);
    // STEP 1で失敗した場合は、ここでエラーを返す
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start model generation process.' });
    }
  }
});


/**
 * モデルの生成結果をポーリング（定期的な確認）する関数
 * @param {string} taskId - 確認するタスクのID
 */
async function pollForModel(taskId) {
    let attempts = 0;
    const maxAttempts = 30; // 最大30回試行（約5分）
    const pollInterval = 10000; // 10秒間隔

    console.log(`Polling for task ${taskId}...`);

    while (attempts < maxAttempts) {
        attempts++;
        try {
            const statusResponse = await axios.get(`${MODEL_SERVER_URL}/api/jobs/${taskId}`);
            const { status, url } = statusResponse.data;

            console.log(`Attempt ${attempts}: Task ${taskId} status is ${status}`);

            if (status === 'ready') {
                console.log(`✅ Success! Model URL for task ${taskId}: ${url}`);
                // ここでWebSocketやWebhookでUnityに通知したり、DBに保存したりする
                return; // ポーリング終了
            } else if (status === 'FAILED') {
                console.error(`❌ Failed! Task ${taskId} failed to generate.`);
                return; // ポーリング終了
            }

            // 成功も失敗もしていない場合は、少し待ってから再試行
            await sleep(pollInterval);

        } catch (error) {
            console.error(`Error polling task ${taskId} on attempt ${attempts}:`, error.message);
            await sleep(pollInterval);
        }
    }
    console.warn(`Polling timed out for task ${taskId} after ${maxAttempts} attempts.`);
}


// --- サーバーの起動 ---
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 My-Orchestrator server listening on http://${HOST}:${PORT}`);
});