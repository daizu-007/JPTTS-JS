// index.ts
// 最終的にはここがエントリーポイントになるが、しばらくは実験場になる。
import voicevox from './services/voicevox';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// これでpythonのinput()と同じように使えるらしい
const rl = readline.createInterface({ input, output });

async function main() {
  while (true) {
    console.log('以下のリストから話者を選択してください。');
    const speakers = await voicevox.fetchSpeakers();

    speakers.forEach((speaker: any) => {
      console.log(`${speaker.speaker_id} ${speaker.name}`);
    });

    const speakerId = await rl.question('話者IDを入力してください: ');

    const audioData = await voicevox.tts('こんにちは、世界！', parseInt(speakerId));
    Bun.write('output.wav', audioData); // 書き込み先のファイル名を指定
    await Bun.spawn(['powershell', '-c', "(New-Object Media.SoundPlayer 'output.wav').PlaySync()"]).exited;

    if ((await rl.question('続けますか？ (y/n): ')) !== 'y') {
      console.log('終了します。');
      rl.close();
      return;
    }
  }
}

main().catch(console.error);
