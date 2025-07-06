// types/service.ts
// 各TTSサービスのインターフェースを定義する

import AudioResult from '../utils/audioResult.js';
import type { Speakers } from './speaker.js';

// 各TTSサービスの設定の型を定義
export type ServiceConfig = {
  baseUrl?: string; // APIのベースURL
  apiKey?: string; // APIキー
  exePath?: string; // 実行ファイルのパス
  timeout?: number; // タイムアウト時間（ミリ秒）
};

// JPTTS全体の設定の型を定義
export type JPTTSConfig = {
  [serviceName: string]: ServiceConfig;
};

// TTSサービスのインターフェースを定義
export interface TTSService {
  serviceName: string; // サービス名
  getConfig: () => ServiceConfig; // サービスの設定を取得するメソッド
  tts: (text: string, speaker: number, style: number | undefined) => Promise<AudioResult>; // 音声合成メソッド
  fetchSpeakers: (forceRefresh?: boolean) => Promise<Speakers>; // 話者リスト取得メソッド
  checkServerStatus: () => Promise<boolean>; // サーバーの状態確認メソッド
}
