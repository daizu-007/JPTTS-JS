// src/index.ts
// ライブラリのエントリーポイント

import AudioResult from './utils/audioResult.js';
import type { TTSService, ServiceConfig, JPTTSConfig } from './types/service.js';

// 利用可能なサービスを格納する型を定義
type AvailableServicesMap = {
  [key: string]: TTSService;
};

// 利用可能なサービス一覧
export enum SpeechServices {
  VOICEVOX = 'voicevox',
  COEIROINK = 'coeiroink',
  TALQu = 'talqu',
  VOICEVOX_WEB = 'voicevox-web',
}

// 型定義をエクスポート
export type { ServiceConfig, JPTTSConfig };

// メインとなるクラスを定義
class JPTTS {
  // 利用可能なサービスを格納する変数を定義
  private availableServices: AvailableServicesMap = {};
  // 初期化が完了したかのフラグを定義
  private isInitialized: boolean = false;
  // 設定を格納する変数を定義
  private config: JPTTSConfig;
  // 使用するサービスのリストを格納する変数を定義
  private servicesToUse: Array<SpeechServices>;

  // Pythonでいうところの__init__メソッド
  constructor(config: JPTTSConfig = {}, services: Array<SpeechServices> = Object.values(SpeechServices)) {
    this.config = config;
    this.servicesToUse = services;
    // ここで初期化処理を行う
  }

  // 初期化メソッドを定義
  async init(): Promise<void> {
    // 初期化が完了している場合は何もしない
    if (this.isInitialized) {
      return;
    }
    // 各サービスのモジュールをインポートする
    for (const serviceName of this.servicesToUse) {
      // サービス名が正しいか確認
      if (!Object.values(SpeechServices).includes(serviceName)) {
        throw new Error(`Invalid service name: ${serviceName}`);
      }
      try {
        const module = await import(`./services/${serviceName}.js`);
        const serviceClass = module.default;
        const serviceConfig: ServiceConfig = this.config[serviceName] || {};
        // サービスのインスタンスを作成
        const serviceInstance = new serviceClass(serviceConfig);
        // サービスが利用可能か確認する
        const isAvailable = await serviceInstance.checkServerStatus();
        if (isAvailable) {
          this.availableServices[serviceName] = serviceInstance;
        }
      } catch (error) {
        console.error(`Error loading service ${serviceName}:`, error);
      }
    }
    this.isInitialized = true;
  }

  // 利用可能なサービスを取得するメソッド
  async fetchAvailableServices(): Promise<Array<string>> {
    if (!this.isInitialized) {
      await this.init(); // 初期化が完了していない場合は初期化を行う
    }
    // 利用可能なサービスのリストを返す
    return Object.keys(this.availableServices);
  }

  // 話者リストを取得するメソッド
  async fetchSpeakers(
    service: SpeechServices,
    forceRefresh?: boolean
  ): Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>> {
    if (!this.isInitialized) {
      await this.init(); // 初期化が完了していない場合は初期化を行う
    }
    let speakers: Array<{ name: string; styles: Array<{ name: string; id: number }> }> | null = null;
    // 指定されたサービスに応じて話者リストを取得する
    if (this.availableServices[service]) {
      speakers = await this.availableServices[service].fetchSpeakers(forceRefresh);
    } else {
      throw new Error(
        `Invalid service specified: ${service}. Available services are: ${Object.keys(this.availableServices).join(', ')}`
      );
    }
    return speakers;
  }

  // 音声合成を行うメソッド
  async generate(text: string, speaker: number, service: SpeechServices): Promise<AudioResult> {
    if (!this.isInitialized) {
      await this.init();
    }
    let audioData: AudioResult;
    // 指定されたサービスに応じて音声合成を行う
    if (this.availableServices[service]) {
      audioData = await this.availableServices[service].tts(text, speaker);
    } else {
      throw new Error('Invalid service specified: ' + service);
    }
    return audioData;
  }
}

export default JPTTS;
