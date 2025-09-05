import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GraphBuilder, GraphTypes, RemoteLLMChatNode, CustomNode, ProcessContext } from "@inworld/runtime/graph";
import { renderJinja } from "@inworld/runtime/primitives/llm";

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.INWORLD_API_KEY;
if (!apiKey) {
  throw new Error("API key is not set in the .env file.");
}

// 修正点1: プロンプトをより直接的で堅牢なものに修正
const characterPrompt = `
### ROLE & GOAL
You are an expert AI Scene Deconstructor. Your goal is to take a user's scene description and break it down into a JSON array of 5-7 distinct 3D objects. Each string in the array must be a technically precise prompt for a 3D generation AI called Meshy-5.

### CORE RULES (Apply to every object prompt)
1.  **Single Object Only:** Each prompt must describe only one object.
2.  **Use Concrete, Physical Descriptions:** Specify materials, colors, textures, finishes, and shapes. (e.g., "brushed aluminum," "matte black powder-coated steel").
3.  **No Abstract Words or Effects:** Do not use words like "beautiful" or non-physical effects like "smoke". Describe physical attributes instead.
4.  **A/T-Pose for Characters:** If the object is a character, add "T-pose" or "A-pose".
5.  **No Negative Prompts:** Only describe what IS present.
6.  **Strict Format:** Each prompt MUST be a comma-separated string following this structure: '[Main Subject], [Shape/Proportions], [Material/Finish/Color], [Style], [Use/Scale], [Quality Tags], (optional: [Pose])'

### EXAMPLE
- **User Input Example:** "I want to create a magical fairytale kingdom."
- **Correct Output Example:**
[
    "a magical fairytale castle, welcoming and enchanting proportions, white walls with blue spires, fantasy style, for a family-friendly park, highly detailed, photorealistic",
    "an ornate streetlamp, whimsical cast-iron pole with a soft glowing lantern, fantasy style, for a fairytale kingdom pathway, detailed",
    "a park bench, carved wood with fairytale animal motifs, dark stained wood, for a fairytale kingdom, detailed"
]

---

### TASK
Now, apply all the rules above to deconstruct the following user request into a JSON array. Respond ONLY with the raw JSON array and no other text.

**User Request to Deconstruct:** "I want to create a park in Shinjuku of the future, with blue and pink neon as the base, and futuristic flower beds, trees, and playground equipment. I also want a striking cyberpunk Tokyo Tower-like object"
`;

const llm = new RemoteLLMChatNode({
  id: "llm",
  provider: "openai",
  modelName: "gpt-4o-mini",
  textGenerationConfig: {
    maxNewTokens: 2048
  },
});

class AppStateToPromptNode extends CustomNode {
    async process(_ctx: ProcessContext, input: { messages: { role: string; content: string }[] }): Promise<GraphTypes.LLMChatRequest> {
        const renderedPrompt: string = await renderJinja(characterPrompt, {
            transcript: input.messages,
        });
        return new GraphTypes.LLMChatRequest({
            messages: [{ role: "system", content: renderedPrompt }],
        });
    }
}

const appStateToPrompt = new AppStateToPromptNode({ id: "app-state-to-prompt" });

const graph = new GraphBuilder({
    id: 'prompt-generator-graph',
    apiKey,
    enableRemoteConfig: false,
})
    .addNode(appStateToPrompt)
    .addNode(llm)
    .addEdge(appStateToPrompt, llm)
    .setStartNode(appStateToPrompt)
    .setEndNode(llm)
    .build();


app.post('/generate-prompt', async (req, res) => {
    const { keyword } = req.body;
    if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
    }

    try {
        const currentMessages = [{ role: "user", content: keyword }];
        const outputStream = await graph.start({ messages: currentMessages });
        
        let aiResponse = "";
        for await (const result of outputStream) {
            result.processResponse({
                // 修正点2: `response.text` を `response.content` に修正
                Content: (response: any) => {
                    if (response.content) { // `text` ではなく `content` を使用
                       aiResponse += response.content;
                    }
                },
                default: () => { },
            });
        }

        console.log(`💬 Inworld AI Raw Response: ${aiResponse}`);

        // AIの応答からJSON部分だけを抽出する処理を追加
        const jsonMatch = aiResponse.match(/\[\s*".*?"\s*\]/s);
        if (jsonMatch) {
            res.json({ prompts: JSON.parse(jsonMatch[0]) });
        } else {
            throw new Error('Valid JSON array not found in AI response.');
        }

    } catch (error) {
        console.error('[Inworld] Error during processing:', error);
        res.status(500).json({ error: 'Failed to generate prompt.' });
    }
});

const PORT = Number(process.env.PORT) || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Inworld AI server listening on http://0.0.0.0:${PORT}`);
});