// src/index.ts
// ライブラリのエントリーポイント

import AudioResult from '@/utils/audioResult';
import coeiroink from './services/coeiroink';
import voicevox from './services/voicevox';

// メインとなるクラスを定義
class JPTTS {
  // ここで各種APIキーを入れる変数を定義する
  // 今のところなし

  // Pythonでいうところの__init__メソッド
  constructor() {
    // 初期化処理があればここに書く
  }

  // 話者リストを取得するメソッド
  async fetchSpeakers(
    service: 'coeiroink' | 'voicevox',
    forceRefresh?: boolean
  ): Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>> {
    let speakers: Array<{ name: string; styles: Array<{ name: string; id: number }> }> | null = null;
    // 指定されたサービスに応じて話者リストを取得する
    if (service === 'coeiroink') {
      speakers = await coeiroink.fetchSpeakers(forceRefresh);
    } else if (service === 'voicevox') {
      speakers = await voicevox.fetchSpeakers(forceRefresh);
    } else {
      throw new Error('Invalid service specified');
    }
    return speakers;
  }

  // 音声合成を行うメソッド
  async generate(text: string, speaker: number, service: 'coeiroink' | 'voicevox'): Promise<AudioResult> {
    let audioData: AudioResult;
    // 指定されたサービスに応じて音声合成を行う
    if (service === 'coeiroink') {
      audioData = await coeiroink.tts(text, speaker);
    } else if (service === 'voicevox') {
      audioData = await voicevox.tts(text, speaker);
    } else {
      throw new Error('Invalid service specified');
    }
    return audioData;
  }
}

if (import.meta.main) {
  // 試してみる
  const jptts = new JPTTS();
  // 話者リストを取得する例
  const speakers = await jptts.fetchSpeakers('coeiroink', true);
  console.log(JSON.stringify(speakers, null, 2)); // 話者リストを表示
  const text = 'こんにちは、世界！';
  const speaker = 11191; // 話者IDを指定
  const service = 'coeiroink'; // 使用するサービスを指定（'coeiroink' または 'voicevox'）
  const result = await jptts.generate(text, speaker, service);
  await result.saveToFile('output.wav');
}
