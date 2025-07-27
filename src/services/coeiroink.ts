// src/services/coeiroink.ts

import AudioResult from '../utils/audioResult.js';
import type { ServiceConfig, TTSService } from '@/types/service.js';
import type { Speakers } from '@/types/speaker.js';

// COEIROINKのクラス
class Coeiroink implements TTSService {
  // サービス名
  public serviceName = 'coeiroink';
  // デフォルトのAPIのベースURL
  private COEIROINK_API_BASE_URL_DEFAULT = 'http://localhost:50032';
  // コンフィグを格納する変数
  private config: ServiceConfig;
  // キャッシュを格納する変数
  private cache_speakers: Speakers | null = null;

  constructor(config: ServiceConfig = {}) {
    this.config = {
      baseUrl: this.COEIROINK_API_BASE_URL_DEFAULT,
      ...config, // スプレッド構文(configを展開)を用いてデフォルト値を上書き
    };
  }

  // コンフィグを取得するメソッド
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  // 動作しているか確認する関数
  async checkServerStatus(): Promise<boolean> {
    try {
      const result = await fetch(this.config.baseUrl!, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!result.ok) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  // 音声合成を行う関数
  async fetchAudioData(text: string, speaker: string, style: string): Promise<ArrayBuffer> {
    const url = `${this.config.baseUrl}/v1/predict`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        speakerUuid: speaker,
        styleId: style,
        speedScale: 1,
      }),
    });
    if (!response.ok) {
      throw new Error(`API error in COEIROINK's PredictAudio call: ${response.status}`);
    }
    return response.arrayBuffer();
  }

  // 話者のリストを取得する関数
  async fetchSpeakers(forceRefresh?: boolean): Promise<Speakers> {
    const shouldForceRefresh = forceRefresh ?? false;
    // キャッシュがある場合はそれを返す
    if (this.cache_speakers !== null && !shouldForceRefresh) {
      return this.cache_speakers;
    }
    // キャッシュがない場合はAPIを呼び出す
    const url = `${this.config.baseUrl}/v1/speakers`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`API error in COEIROINK's Speakers call: ${response.status}`);
    }
    const speakersResponse = (await response.json()) as Array<{
      speakerName: string;
      speakerUuid: string;
      styles: Array<{
        styleName: string;
        styleId: number;
        base64Icon: string;
        base64Portrait: string;
      }>;
      version: string;
      base64Portrait: string;
    }>;
    const speakers: Array<{ uuid: string; name: string; styles: Array<{ name: string; uuid: string }> }> = [];
    speakersResponse.forEach((speaker) => {
      const styles: Array<{ name: string; uuid: string }> = [];
      speaker.styles.forEach((style) => {
        styles.push({
          name: style.styleName,
          uuid: style.styleId.toString(),
        });
      });
      speakers.push({
        uuid: speaker.speakerUuid,
        name: speaker.speakerName,
        styles: styles,
      });
    });
    // キャッシュに保存
    this.cache_speakers = speakers;
    return speakers;
  }

  // 最適なスタイルを選択する関数
  private async selectBestStyle(speaker: string): Promise<string> {
    // スピーカーのスタイルを取得
    const speakers = await this.fetchSpeakers();
    const speakerStyles = speakers.find((s) => s.uuid === speaker)?.styles;
    if (!speakerStyles || speakerStyles.length === 0) {
      throw new Error(`No styles found for speaker ${speaker}`);
    }
    // 最初のスタイルを返す（必要に応じてロジックを変更可能）
    return speakerStyles[0]!.uuid;
  }

  // 音声合成エンドポイント
  async tts(text: string, speaker: string, style: string | undefined): Promise<AudioResult> {
    if (!style) {
      style = await this.selectBestStyle(speaker); // スタイルが指定されていない場合は最適なスタイルを選択
    }
    const audioData = await this.fetchAudioData(text, speaker, style);
    return new AudioResult(audioData); // AudioResultクラスのインスタンスを返す
  }
}

export default Coeiroink;
