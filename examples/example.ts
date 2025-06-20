// examples/example.ts

import JPTTS, { JPTTSConfig, SpeechServices } from '../dist/index.js';
import * as readline from 'readline';

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

// コンフィグを設定
const config: JPTTSConfig = {
  voicevox: {
    baseUrl: 'http://localhost:50021',
  },
  talqu: {
    exePath: 'C:/Applications/TALQu/TALQu_CMDClient.exe',
    timeout: 3000, // タイムアウト時間を設定
  },
  'voicevox-web': {
    apiKey: process.env.VOICEVOX_WEB_API_KEY || '',
  },
};
// 使いたいサービスを指定
const servicesToUse = [SpeechServices.VOICEVOX_WEB];
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
let speaker: { name: string; styles: { id: number }[] } | undefined;
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

// スタイルを取得
const style = speaker.styles[0];
if (!style) {
  console.error('No available speaker ID found.');
  process.exit(1);
}
const speakerId = style.id;
console.log('Using speaker ID:', speakerId);
// 音声合成を行う
const text = await input('Enter text to synthesize: ');
console.log('Synthesizing text:', text);
const result = await jptts.generate(text, speakerId, selectedService);
// ファイルに保存する
const outputFilePath = 'output.wav';
await result.saveToFile(outputFilePath);
console.log(`Audio saved to ${outputFilePath}`);

// 終了処理
rl.close();
