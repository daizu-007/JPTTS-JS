// examples/example.ts

import JPTTS from '../dist/index.js';

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
// 最初に見つかったサービスを使用
const service = services[0];
if (!service) {
  console.error('No available services found.');
  process.exit(1);
}
console.log('Using service:', service);
// 話者リストを取得する
const speakers = await jptts.fetchSpeakers(service);
console.log('Speakers:', JSON.stringify(speakers, null, 2));
// 最初の話者を使用
const speaker = speakers[0];
if (!speaker) {
  console.error('No available speakers found.');
  process.exit(1);
}
const style = speaker.styles[0];
if (!style) {
  console.error('No available speaker ID found.');
  process.exit(1);
}
const speakerId = style.id;
console.log('Using speaker:', speaker.name, 'ID:', speakerId);
// 音声合成を行う
const text = 'こんにちは、これはテストです。';
const result = await jptts.generate(text, speakerId, service);
// ファイルに保存する
const outputFilePath = 'output.wav';
await result.saveToFile(outputFilePath);
console.log(`Audio saved to ${outputFilePath}`);
