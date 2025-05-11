// src/services/coeiroink.ts

import AudioResult from '../utils/audioResult.js';
import type { ServiceConfig, TTSService } from '@/types/service.js';

// COEIROINKのクラス
class Coeiroink implements TTSService {
  // サービス名
  public serviceName = 'coeiroink';
  // デフォルトのAPIのベースURL
  private COEIROINK_API_BASE_URL_DEFAULT = 'http://localhost:50032';
  // コンフィグを格納する変数
  private config: ServiceConfig;
  // キャッシュを格納する変数
  private cache_speakers: Array<{
    uuid: string;
    name: string;
    styles: Array<{ name: string; id: number }>;
  }> | null = null;

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
  async fetchAudioData(text: string, speaker: number): Promise<ArrayBuffer> {
    const url = `${this.config.baseUrl}/v1/predict`;
    // Combined IDの先頭'1'を削除し，UUID部分とstyleId部分に分割
    const idStr = speaker.toString().slice(1);
    const speakerList = await this.getSpeakers();
    const uuidLength = speakerList.length.toString().length;
    const index = Number(idStr.slice(0, uuidLength));
    const styleId = Number(idStr.slice(uuidLength));
    let speaker_uuid = '';
    if (speakerList[index]) {
      speaker_uuid = speakerList[index].uuid;
    } else {
      console.error(`Speaker not found: ${speaker}`);
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        speakerUuid: speaker_uuid,
        styleId: styleId,
        speedScale: 1,
      }),
    });
    if (!response.ok) {
      throw new Error(`API error in COEIROINK's PredictAudio call: ${response.status}`);
    }
    return response.arrayBuffer();
  }

  // 話者のリストを取得する関数
  // 公開しない
  async getSpeakers(
    forceRefresh?: boolean
  ): Promise<Array<{ uuid: string; name: string; styles: Array<{ name: string; id: number }> }>> {
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
    // 数値のみのUUIDを独自に生成する
    const uuidLength = speakersResponse.length.toString().length; // 何桁あれば重複しないかを計算
    let x = 0;
    const speakers: Array<{ uuid: string; name: string; styles: Array<{ name: string; id: number }> }> = [];
    speakersResponse.forEach((speaker) => {
      const uuid = x.toString().padStart(uuidLength, '0');
      x += 1;
      const styles: Array<{ name: string; id: number }> = [];
      speaker.styles.forEach((style) => {
        const id = parseInt('1' + uuid + style.styleId.toString()); // UUIDとStyleIDを結合して数値に変換
        styles.push({
          name: style.styleName,
          id: id,
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

  // 公開用のfetchSpeakers関数
  async fetchSpeakers(
    forceRefresh?: boolean
  ): Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>> {
    const speakers = await this.getSpeakers(forceRefresh);
    return speakers.map((speaker) => ({
      name: speaker.name,
      styles: speaker.styles,
    }));
  }

  // 音声合成エンドポイント
  async tts(text: string, speaker: number): Promise<AudioResult> {
    const audioData = await this.fetchAudioData(text, speaker);
    return new AudioResult(audioData); // AudioResultクラスのインスタンスを返す
  }
}

export default Coeiroink;
