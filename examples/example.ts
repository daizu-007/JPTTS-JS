// examples/example.ts

import JPTTS, { JPTTSConfig, SpeechServices } from '../dist/index.js';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// コマンドライン入力を受け取れるようにする
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
// コマンドライン入力を受け取る関数
function input(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// outputディレクトリがなければ作成
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}
// outputディレクトリの中身を削除
fs.readdirSync(outputDir).forEach((file) => {
  fs.unlinkSync(path.join(outputDir, file));
});

// コンフィグを設定
const config: JPTTSConfig = {
  voicevox: {
    baseUrl: 'http://localhost:50021',
  },
  talqu: {
    exePath: 'C:/Applications/TALQu/TALQu_CMDClient.exe',
    timeout: 30000, // タイムアウト時間を設定
  },
  'voicevox-web': {
    apiKey: process.env.VOICEVOX_WEB_API_KEY || '',
  },
  'assistant-seika': {
    exePath: 'C:/Applications/AssistantSeika/assistantseika20250113a/SeikaSay2/SeikaSay2.exe',
  },
};
// 使いたいサービスを指定
const servicesToUse = [SpeechServices.VOICEVOX_WEB, SpeechServices.ASSISTANT_SEIKA];
// JPTTSのインスタンスを作成
const jptts = new JPTTS(config);
// 初期化を行う
await jptts.init();
// 利用可能なサービスを取得する
const availableServices = await jptts.fetchAvailableServices();
console.log('Available services:', availableServices);
// サービスを選択させる（正しいものを選ぶまで繰り返す）
let selectedService: SpeechServices;
while (true) {
  const serviceInput = await input('Select a service: ');
  const isValidService = Object.values(SpeechServices).includes(serviceInput as SpeechServices);
  const isAvailable = availableServices.includes(serviceInput);
  if (isValidService && isAvailable) {
    selectedService = serviceInput as SpeechServices;
    console.log('Using service:', selectedService);
    break;
  } else if (!isValidService) {
    console.error('Invalid service name. Please select a valid service.');
  } else if (!isAvailable) {
    console.error('Service not available. Please select a different service.');
  }
}

// 話者リストを取得する
const speakers = await jptts.fetchSpeakers(selectedService);
console.log('Speakers:', JSON.stringify(speakers, null, 2));

// 話者を選択させる（正しいものを選ぶまで繰り返す）
let speaker: { uuid: string; name: string; styles: { name: string; uuid: string }[] } | undefined;
while (true) {
  const speakerName = await input('Select a speaker: ');
  speaker = speakers.find((s) => s.name === speakerName);
  if (speaker) {
    console.log('Using speaker:', speaker.name);
    break;
  } else {
    console.error('Speaker not found. Please select a valid speaker.');
  }
}
// 音声合成を行う
const text = await input('Enter text to synthesize: ');
console.log('Synthesizing text:', text);
const result = await jptts.synthesizeStream(text, speaker.uuid, selectedService);
let chunkIndex = 0;
for await (const chunk of result) {
  // ファイルに保存する
  const outputFilePath = `output/output_${chunkIndex}.wav`;
  await chunk.saveToFile(outputFilePath);
  console.log(`Audio saved to ${outputFilePath}`);
  chunkIndex++;
}

// 終了処理
rl.close();
