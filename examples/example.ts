// examples/example.ts

import JPTTS from '../dist/index.js';
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
const config = {
  VOICEVOX: {
    baseUrl: 'http://localhost:50021',
  },
};
// JPTTSのインスタンスを作成
const jptts = new JPTTS(config);
// 初期化を行う
await jptts.init();
// 利用可能なサービスを取得する
const services = await jptts.fetchAvailableServices();
console.log('Available services:', services);
// サービスを選択させる（正しいものを選ぶまで繰り返す）
let service: string;
while (true) {
  service = await input('Select a service: ');
  if (services.includes(service)) {
    console.log('Using service:', service);
    break;
  } else {
    console.error('Invalid service. Please select a valid service.');
  }
}

// 話者リストを取得する
const speakers = await jptts.fetchSpeakers(service);
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
const result = await jptts.generate(text, speakerId, service);
// ファイルに保存する
const outputFilePath = 'output.wav';
await result.saveToFile(outputFilePath);
console.log(`Audio saved to ${outputFilePath}`);

// 終了処理
rl.close();
