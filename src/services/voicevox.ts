// src/services/voicevox.ts

import AudioResult from '../utils/audioResult.js';
import type { ServiceConfig, TTSService } from '@/types/service.js';

// VOICEVOXのクラス
class VoiceVox implements TTSService {
  // サービス名
  public serviceName = 'voicevox';
  // デフォルトのAPIのベースURL
  private VOICEVOX_API_BASE_URL_DEFAULT = 'http://localhost:50021';
  // コンフィグを格納する変数
  private config: ServiceConfig;
  // キャッシュを格納する変数
  private cache_speakers: Array<{
    name: string;
    styles: Array<{ name: string; id: number }>;
  }> | null = null;

  constructor(config: ServiceConfig = {}) {
    this.config = {
      baseUrl: this.VOICEVOX_API_BASE_URL_DEFAULT,
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

  // 音声合成用のクエリを作成する関数
  async fetchAudioQuery(text: string, speaker: number): Promise<any> {
    const url = `${this.config.baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`API error in VOICEVOX's AudioQuery call: ${response.status}`);
    }
    return response.json(); // JSONレスポンスを取得
  }

  // 音声合成を行う関数
  async fetchAudioData(query: any, speaker: number): Promise<ArrayBuffer> {
    const url = `${this.config.baseUrl}/synthesis?speaker=${speaker}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });
    if (!response.ok) {
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
    // キャッシュがない場合はAPIを呼び出す
    const url = `${this.config.baseUrl}/speakers`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
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
    const audioQuery = await this.fetchAudioQuery(text, speaker);
    const audioData = await this.fetchAudioData(audioQuery, speaker);
    return new AudioResult(audioData); // AudioResultクラスのインスタンスを返す
  }
}

export default VoiceVox;
