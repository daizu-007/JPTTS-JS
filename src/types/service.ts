// types/service.ts
// 各TTSサービスのインターフェースを定義する

import AudioResult from '../utils/audioResult.js';

// 各TTSサービスの設定の型を定義
export type ServiceConfig = {
  baseUrl?: string; // APIのベースURL
  apiKey?: string; // APIキー
};

// JPTTS全体の設定の型を定義
export type JPTTSConfig = {
  [serviceName: string]: ServiceConfig;
};

// TTSサービスのインターフェースを定義
export interface TTSService {
  serviceName: string; // サービス名
  getConfig: () => ServiceConfig; // サービスの設定を取得するメソッド
  tts: (text: string, speaker: number) => Promise<AudioResult>; // 音声合成メソッド
  fetchSpeakers: (
    forceRefresh?: boolean
  ) => Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>>; // 話者リスト取得メソッド
  checkServerStatus: () => Promise<boolean>; // サーバーの状態確認メソッド
}
