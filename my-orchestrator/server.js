require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const INWORLD_SERVER_URL = 'http://localhost:3002';
const MODEL_SERVER_URL = 'http://localhost:3000';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// server.js のこの関数をまるごと置き換えてください
app.post('/generate-model', async (req, res) => {
  console.log('--- Received request on /generate-model ---');
  
  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }
  
  try {
    // ステップ1: Inworld AIサーバーにプロンプト生成をリクエスト
    console.log(`[Orchestrator] Requesting prompt from Inworld AI with keyword: "${keyword}"`);
    const inworldResponse = await axios.post(`${INWORLD_SERVER_URL}/generate-prompt`, {
      keyword: keyword,
    });
    
    console.log('[Orchestrator] Received response from Inworld AI server:', inworldResponse.data);
    
    // 修正点1: 正しいキー名 `prompts` でデータを受け取る
    const prompts = inworldResponse.data.prompts;

    // 修正点2: データが配列であることを確認する
    if (!Array.isArray(prompts)) {
      throw new Error('Inworld AI did not return a valid JSON array.');
    }
    
    console.log(`[Orchestrator] Parsed ${prompts.length} prompts from Inworld AI.`);
    
    // ステップ2: 受け取った各プロンプトで、Meshyサーバーにモデル生成をリクエスト
    const creationPromises = prompts.map(prompt => {
      console.log(`[Orchestrator] Sending prompt to model server: "${prompt}"`);
      return axios.post(`${MODEL_SERVER_URL}/api/3Dcontents`, { prompt });
    });

    const creationResponses = await Promise.all(creationPromises);
    const taskIds = creationResponses.map(response => response.data.jobId);
    
    console.log(`[Orchestrator] All tasks created with IDs:`, taskIds);
    
    // ステップ3: Unity側にタスクIDを返す
    res.status(202).json({ message: `${taskIds.length} model generation tasks started.`, taskIds: taskIds });

    // ステップ4: 裏側でポーリングを開始
    taskIds.forEach(taskId => {
      pollForModel(taskId);
    });

  } catch (error) {
    const errorMessage = error.response ? error.response.data : (error.message || error);
    console.error('[Orchestrator] Error in /generate-model:', errorMessage);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process generation request.', details: errorMessage });
    }
  }
});

async function pollForModel(taskId) {
    let attempts = 0;
    const maxAttempts = 60;
    const pollInterval = 10000;

    console.log(`[Task ${taskId}] Polling started...`);
    while (attempts < maxAttempts) {
        attempts++;
        try {
            const statusResponse = await axios.get(`${MODEL_SERVER_URL}/api/jobs/${taskId}`);
            const { status, url, error } = statusResponse.data;

            console.log(`[Task ${taskId}] Attempt ${attempts}: Status is ${status}`);
            if (status === 'ready') {
                console.log(`✅ [Task ${taskId}] Success! Model URL: ${url}`);
                return;
            } else if (status === 'error') {
                console.error(`❌ [Task ${taskId}] Failed! Reason: ${error}`);
                return;
            }
            await sleep(pollInterval);
        } catch (error) {
            console.error(`[Task ${taskId}] Error polling:`, error.message);
            await sleep(pollInterval);
        }
    }
    console.warn(`[Task ${taskId}] Polling timed out.`);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 My-Orchestrator server listening on http://0.0.0.0:${PORT}`);
});