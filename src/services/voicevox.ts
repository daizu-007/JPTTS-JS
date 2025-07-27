// src/services/voicevox.ts

import AudioResult from '../utils/audioResult.js';
import type { ServiceConfig, TTSService } from '@/types/service.js';
import type { Speakers } from '@/types/speaker.js';

// VOICEVOXのクラス
class VoiceVox implements TTSService {
  // サービス名
  public serviceName = 'voicevox';
  // デフォルトのAPIのベースURL
  private VOICEVOX_API_BASE_URL_DEFAULT = 'http://localhost:50021';
  // コンフィグを格納する変数
  private config: ServiceConfig;
  // キャッシュを格納する変数
  private cache_speakers: Speakers | null = null;

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
  async fetchAudioQuery(text: string, speaker: string, style: string): Promise<any> {
    const voiceId = await this.generateUrlId(speaker, style);
    const url = `${this.config.baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${voiceId}`;
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
  async fetchAudioData(query: any, speaker: string, style: string): Promise<ArrayBuffer> {
    const voiceId = await this.generateUrlId(speaker, style);
    const url = `${this.config.baseUrl}/synthesis?speaker=${voiceId}`;
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
  async fetchSpeakers(forceRefresh?: boolean): Promise<Speakers> {
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
    const speakers: Speakers = [];
    let id = 0; // IDを振るためのカウンター
    speakersResponse.forEach((speaker) => {
      const styles: Array<{ name: string; uuid: string }> = [];
      speaker.styles.forEach((style) => {
        styles.push({
          name: style.name,
          uuid: style.id.toString(),
        });
      });
      speakers.push({
        uuid: id.toString(),
        name: speaker.name,
        styles: styles,
      });
      id += 1; // IDをインクリメント
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
      throw new Error(`Speaker with ID ${speaker} does not have any styles available.`);
    }
    // デフォルトのスタイルを返す
    return speakerStyles[0]!.uuid;
  }

  // 話者IDとスタイルIDからURL用のIDを生成する関数
  private async generateUrlId(speaker: string, style: string): Promise<string> {
    const speakerObjects = await this.fetchSpeakers();
    const speakerObject = speakerObjects.find((s) => s.uuid === speaker);
    if (!speakerObject) {
      throw new Error(`Speaker with ID ${speaker} not found.`);
    }
    const voiceId = speakerObject.styles.find((s) => s.uuid === style)?.uuid;
    if (!voiceId) {
      throw new Error(`Style with ID ${style} not found for speaker ${speakerObject.name}.`);
    }
    return voiceId.toString();
  }

  // 音声合成エンドポイント
  async tts(text: string, speaker: string, style: string | undefined): Promise<AudioResult> {
    const speakerList = await this.fetchSpeakers();
    if (!speakerList.some((s) => s.uuid === speaker)) {
      throw new Error(
        `Invalid speaker ID: ${speaker}. Available speakers are: ${speakerList.map((s) => s.uuid).join(', ')}`
      );
    }
    if (!style) {
      style = await this.selectBestStyle(speaker); // スタイルが指定されていない場合は最適なスタイルを選択
    }
    const audioQuery = await this.fetchAudioQuery(text, speaker, style);
    const audioData = await this.fetchAudioData(audioQuery, speaker, style);
    return new AudioResult(audioData); // AudioResultクラスのインスタンスを返す
  }
}

export default VoiceVox;
