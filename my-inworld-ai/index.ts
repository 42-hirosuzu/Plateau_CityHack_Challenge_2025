import 'dotenv/config';
import * as readline from "node:readline/promises";
import { GraphBuilder, GraphTypes, RemoteLLMChatNode, CustomNode, ProcessContext } from "@inworld/runtime/graph";
import { renderJinja } from "@inworld/runtime/primitives/llm";

// APIキーの読み込み
const apiKey = process.env.INWORLD_API_KEY;
if (!apiKey) {
  throw new Error("API key is not set in the .env file.");
}

// ----------------------------------------------------------------
// ▼▼▼ ここにあなたのAIへの指示を書き込みます ▼▼▼
// ----------------------------------------------------------------
const characterPrompt = `
## Role & Goal
You are an expert AI Art Director. Your goal is to receive a natural language request from a user, interpret it, and then generate a numbered list of specific, actionable prompts for a 3D modeling AI called Meshy.

## Context
The user wants to generate a unique 3D landscape that reflects a specific theme but also adheres to local characteristics and rules. You will act as the creative bridge, deconstructing the high-level theme into a list of individual 3D objects that can be generated one by one.

## Input Format
You will receive a single sentence or a short paragraph from the user. This text will contain a theme, a location, and potentially some rules or policies mixed in. Your first job is to parse this text to identify these key components.

## Task
1.  **Analyze the Theme:** Deeply understand the core visual elements of the requested "theme". For example, "Disneyland" involves a central castle, themed lands, fantasy architecture, specific types of foliage, etc.
2.  **Incorporate Location & Policies:** Synthesize the theme's elements with any provided location details and policies/rules. For example, if the theme is "Disneyland" and the location is "Kyoto" with a policy to "respect historical scenery," you might design a castle with Japanese-style roofs.
3.  **Deconstruct into Objects:** Break down the synthesized scene into a list of 5 to 7 key, distinct 3D objects that collectively create the landscape.
4.  **Generate Prompts:** For each object, write a clear, detailed, and visually rich prompt suitable for the Meshy 3D generation AI. The prompt must be a single, descriptive sentence.
5.  **Output as a Numbered List:** Format the final output as a simple, numbered list.

## Output Format
You must respond with ONLY a numbered list of 5 to 7 prompts. Each item in the list must be a single, descriptive sentence. Do not include any other text, conversation, or explanations in your response. Start directly with "1.".

### Example
**User Input:**
I want to create a magical fairytale kingdom in Urayasu, Chiba, but the main castle cannot be taller than 51 meters and the style must be welcoming to families.

**Your Output:**
1. A magical fairytale castle with white walls and blue spires, intricate details, under 51 meters tall, creating a welcoming and enchanting atmosphere.
2. An ornate, whimsical cast-iron streetlamp with a soft, glowing lantern, suitable for a fairytale kingdom.
3. A clean, wide cobblestone pathway, with charming, slightly irregular stones, perfect for a family-friendly park.
4. A carved wooden park bench with fairytale animal motifs, looking sturdy and inviting.
5. A vibrant, colorful flowerbed with oversized, fantastical flowers that seem to emit a gentle light.
`;
// ----------------------------------------------------------------
// ▲▲▲ 指示はここまで ▲▲▲
// ----------------------------------------------------------------


// --- 以下はInworld AIを動かすための専門的なコードです ---

// ユーザーとの会話履歴を保存する場所
let messages: { role: string; content: string; }[] = [];

// Inworld AIの頭脳（LLM）を準備
const llm = new RemoteLLMChatNode({
  id: "llm",
  provider: "openai",
  modelName: "gpt-4o-mini",
});

// 上で設定した指示(Prompt)をAIの頭脳に渡すための処理
class AppStateToPromptNode extends CustomNode {
  async process(
    _context: ProcessContext,
    input: { messages: { role: string; content: string }[] }
  ): Promise<GraphTypes.LLMChatRequest> {
    const renderedPrompt: string = await renderJinja(characterPrompt, {
      transcript: input.messages,
    });
    return new GraphTypes.LLMChatRequest({
      messages: [{ role: "system", content: renderedPrompt }],
    });
  }
}

const appStateToPrompt = new AppStateToPromptNode({ id: "app-state-to-prompt" });

// AIの動作の流れを組み立て
const graph = new GraphBuilder({
  id: 'quick-start',
  apiKey,
  telemetry: { disabled: true } // エラー回避のためテレメトリは無効化
})
  .addNode(llm)
  .addNode(appStateToPrompt)
  .setStartNode(appStateToPrompt)
  .addEdge(appStateToPrompt, llm)
  .setEndNode(llm)
  .build();

// ターミナルで文字入力を受け付けるための準備
const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// メインの実行部分
async function main() {
  console.log('AI is ready. Please enter a word and press Enter. (To exit, press Ctrl+C)');
  while (true) {
    const userInput = await terminal.question(`You: `);
    messages.push({ role: "user", content: userInput });

    const outputStream = await graph.start({ messages });

    process.stdout.write('AI: ');
    for await (const result of outputStream) {
      result.processResponse({
        Content: (response: GraphTypes.Content) => {
          process.stdout.write(response.content);
          messages.push({ role: "assistant", content: response.content });
        },
        default: (data: any) => {},
      });
    }
    process.stdout.write('\n');
  }
}

main().catch(console.error);