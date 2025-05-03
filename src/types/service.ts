// types/service.ts
// 各TTSサービスのインターフェースを定義する

import AudioResult from '../utils/audioResult.js';

export interface TTSService {
  serviceName: string; // サービス名
  tts: (text: string, speaker: number) => Promise<AudioResult>; // 音声合成メソッド
  fetchSpeakers: (
    forceRefresh?: boolean
  ) => Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>>; // 話者リスト取得メソッド
  checkServerStatus: () => Promise<boolean>; // サーバーの状態確認メソッド
}
