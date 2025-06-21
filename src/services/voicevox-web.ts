// src/services/voicevox-web.ts

import { URLSearchParams } from 'url';
import AudioResult from '../utils/audioResult.js';
import type { ServiceConfig, TTSService } from '@/types/service.js';

// Web版VOICEVOXのクラス
class VoiceVoxWeb implements TTSService {
  // サービス名
  public serviceName = 'voicevox-web';
  // コンフィグを格納する変数
  private config: ServiceConfig;
  // キャッシュを格納する変数
  private cache_speakers: Array<{
    name: string;
    styles: Array<{ name: string; id: number }>;
  }> | null = null;

  constructor(config: ServiceConfig = {}) {
    this.config = {
      apiKey: '',
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
      const speakers = await this.fetchSpeakers();
      // 話者リストが1つ以上あればサーバーは動作しているとみなす
      return Array.isArray(speakers) && speakers.length > 0;
    } catch (error) {
      // エラーが発生した場合はサーバーが動作していないとみなす
      return false;
    }
  }

  // 音声合成を行う関数
  async fetchAudioData(text: string, speaker: number): Promise<ArrayBuffer> {
    // APIキーが設定されていない場合はエラーを投げる
    if (!this.config.apiKey) {
      throw new Error('API key is required for VOICEVOX Web service.');
    }
    const url = `https://deprecatedapis.tts.quest/v2/voicevox/audio/?speaker=${speaker}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        key: this.config.apiKey,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from VOICEVOX:', errorText);
      throw new Error(`API error in VOICEVOX's SynthesisAudio call: ${response.status}`);
    }
    return response.arrayBuffer(); // バイナリデータをArrayBufferとして取得
  }

  // 話者のリストを取得する関数
  async fetchSpeakers(
    forceRefresh?: boolean
  ): Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>> {
    const shouldForceRefresh = forceRefresh ?? false;
    // キャッシュがある場合はそれを返す
    if (this.cache_speakers !== null && !shouldForceRefresh) {
      return this.cache_speakers;
    }
    // APIキーが設定されていない場合はエラーを投げる
    if (!this.config.apiKey) {
      throw new Error('API key is required for VOICEVOX Web service.');
    }
    // キャッシュがない場合はAPIを呼び出す
    const url = `https://deprecatedapis.tts.quest/v2/voicevox/speakers/?key=${this.config.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error in VOICEVOX's Speakers call: ${response.status}`);
    }
    const speakersResponse = (await response.json()) as Array<{
      name: string;
      speaker_uuid: string;
      styles: Array<{ name: string; id: number; type: string }>;
      version: string;
      supported_features: { permitted_synthesis_morphing: string };
    }>;
    const speakers: Array<{ name: string; styles: Array<{ name: string; id: number }> }> = [];
    speakersResponse.forEach((speaker) => {
      const styles: Array<{ name: string; id: number }> = [];
      speaker.styles.forEach((style) => {
        styles.push({
          name: style.name,
          id: style.id,
        });
      });
      speakers.push({
        name: speaker.name,
        styles: styles,
      });
    });
    // キャッシュに保存
    this.cache_speakers = speakers;
    return speakers;
  }

  // 音声合成エンドポイント
  async tts(text: string, speaker: number): Promise<AudioResult> {
    const audioData = await this.fetchAudioData(text, speaker);
    return new AudioResult(audioData); // AudioResultクラスのインスタンスを返す
  }
}

export default VoiceVoxWeb;
