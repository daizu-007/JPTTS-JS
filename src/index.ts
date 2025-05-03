// src/index.ts
// ライブラリのエントリーポイント

import AudioResult from './utils/audioResult.js';
import coeiroink from './services/coeiroink.js';
import voicevox from './services/voicevox.js';
import type { TTSService } from './types/service.js';
import fs from 'fs/promises';
import path from 'path';

// 利用可能なサービスを格納する型を定義
type AvailableServicesMap = {
  [key: string]: TTSService;
};

// メインとなるクラスを定義
class JPTTS {
  // ここで各種APIキーを入れる変数を定義する
  // 今のところなし
  // 利用可能なサービスを格納する変数を定義
  private availableServices: AvailableServicesMap = {};
  // 初期化が完了したかのフラグを定義
  private isInitialized: boolean = false;

  // Pythonでいうところの__init__メソッド
  constructor() {
    // ここで初期化処理を行う
  }

  // 初期化メソッドを定義
  async init(): Promise<void> {
    // 初期化が完了している場合は何もしない
    if (this.isInitialized) {
      return;
    }
    const currentFilePath = new URL(import.meta.url).pathname;
    const dirname = path.dirname(currentFilePath.replace(/^\//, ''));
    const servicesDir = path.join(dirname, 'services');
    // servicesディレクトリ内のファイルを取得する
    const files = await fs.readdir(servicesDir);
    // 各サービスのモジュールをインポートする
    for (const file of files) {
      if (file.endsWith('.js') && file !== 'index.js') {
        const serviceName = file.replace('.js', '');
        const serviceModule = await import(`./services/${file}`);
        const serviceClass = serviceModule.default;
        // サービスが利用可能か確認する
        const isAvailable = await serviceClass.checkServerStatus();
        if (isAvailable) {
          this.availableServices[serviceName] = serviceModule.default;
        }
      }
    }
    this.isInitialized = true;
  }

  // 利用可能なサービスを取得するメソッド
  async fetchAvailableServices(): Promise<Array<string>> {
    // 利用可能なサービスのリストを返す
    return Object.keys(this.availableServices);
  }

  // 話者リストを取得するメソッド
  async fetchSpeakers(
    service: string,
    forceRefresh?: boolean
  ): Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>> {
    let speakers: Array<{ name: string; styles: Array<{ name: string; id: number }> }> | null = null;
    // 指定されたサービスに応じて話者リストを取得する
    if (this.availableServices[service]) {
      speakers = await this.availableServices[service].fetchSpeakers(forceRefresh);
    } else {
      throw new Error(
        'Invalid service specified. Available services are: ' + Object.keys(this.availableServices).join(', ')
      );
    }
    return speakers;
  }

  // 音声合成を行うメソッド
  async generate(text: string, speaker: number, service: string): Promise<AudioResult> {
    let audioData: AudioResult;
    // 指定されたサービスに応じて音声合成を行う
    if (this.availableServices[service]) {
      audioData = await this.availableServices[service].tts(text, speaker);
    } else {
      throw new Error('Invalid service specified');
    }
    return audioData;
  }
}

if (import.meta.main || true) {
  // 試してみる
  const jptts = new JPTTS();
  await jptts.init(); // 初期化を行う
  // 利用可能なサービスを取得する例
  const availableServices = await jptts.fetchAvailableServices();
  console.log('Available services:', availableServices); // 利用可能なサービスを表示
  // サーバーの状態を確認する例
  const isServerRunning = await voicevox.checkServerStatus();
  console.log(`VOICEVOX server is running: ${isServerRunning}`); // サーバーの状態を表示
  const isServerRunning2 = await coeiroink.checkServerStatus();
  console.log(`COEIROINK server is running: ${isServerRunning2}`); // サーバーの状態を表示
  // 話者リストを取得する例
  const speakers = await jptts.fetchSpeakers('coeiroink', true);
  console.log(JSON.stringify(speakers, null, 2)); // 話者リストを表示
  const text = '無事にテストに成功しました！おめでとうございます！！';
  const speaker = 10210; // 話者IDを指定
  const service = 'coeiroink'; // 使用するサービスを指定（'coeiroink' または 'voicevox'）
  const result = await jptts.generate(text, speaker, service);
  await result.saveToFile('output.wav');
}
