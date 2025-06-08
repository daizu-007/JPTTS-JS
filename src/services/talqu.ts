// src/services/talqu.ts

import AudioResult from '../utils/audioResult.js';
import type { ServiceConfig, TTSService } from '@/types/service.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { error } from 'console';

const execPromise = promisify(exec);

// TALQUのクラス
class Talqu implements TTSService {
  // サービス名
  public serviceName = 'talqu';
  // コンフィグを格納する変数
  private config: ServiceConfig;
  // キャッシュを格納する変数
  private cache_speakers: Array<{
    name: string;
    styles: Array<{ name: string; id: number }>;
  }> | null = null;

  constructor(config: ServiceConfig = {}) {
    this.config = {
      timeout: 3000, // デフォルトのタイムアウト時間(ミリ秒)
      ...config,
    };
  }

  // コンフィグを取得するメソッド
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  // 動作しているか確認する関数
  async checkServerStatus(): Promise<boolean> {
    try {
      await fs.access(this.config.exePath!);
      await this.getVersion();
      // 起動していなくてもバージョンを返すため実際に動作することを確認する
      try {
        await execPromise(`"${this.config.exePath}" getSpkName`, { timeout: this.config.timeout! });
        return true;
      } catch (error) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // バージョンを取得する関数
  async getVersion(): Promise<string> {
    try {
      const { stdout } = await execPromise(`"${this.config.exePath}" getVersion`);
      return stdout.trim();
    } catch (error) {
      throw new Error('Failed to get TALQu version');
    }
  }

  // 話者リストを取得
  async fetchSpeakers(
    forceRefresh = false
  ): Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>> {
    if (this.cache_speakers && !forceRefresh) {
      return this.cache_speakers;
    }
    try {
      // タイムアウトがないとフリーズの原因となるため、タイムアウト付きでコマンドを実行
      const { stdout } = await execPromise(`"${this.config.exePath}" getSpkName`, { timeout: this.config.timeout! });
      const speakerNames = stdout.trim().split(',');
      // JPTTSの形式に変換
      this.cache_speakers = speakerNames.map((name, index) => {
        return {
          name,
          styles: [{ name: 'デフォルト', id: index }],
        };
      });
      return this.cache_speakers;
    } catch (error) {
      throw new Error(`TALQuから話者リストを取得できません: ${error}`);
    }
  }

  // 音声合成
  async tts(text: string, speakerId: number): Promise<AudioResult> {
    if (!this.cache_speakers) {
      await this.fetchSpeakers();
    }
    if (!this.cache_speakers || speakerId >= this.cache_speakers.length) {
      throw new Error('無効な話者IDです');
    }
    const speakerName = this.cache_speakers[speakerId]!.name;
    console.log(`Using speaker: ${speakerName}`);
    const tempWavPath = path.join(os.tmpdir(), `talqu_${Date.now()}.wav`);
    try {
      // TALQuの合成コマンド実行
      const args = [
        speakerName,
        tempWavPath,
        text,
        '', // pronunciation
        '', // play_flag
        '', // speech_speed
        '', // intonation
        '', // pitch_model
        '', // short_pause
        '', // long_pause
        '', // pitch
        '', // formant
        '', // refine_flag
      ];
      const commandStr = args.join(',');
      console.log(`Running TALQu command: "${this.config.exePath}" ${commandStr}`);
      const stdout = await execPromise(`"${this.config.exePath}" ${commandStr}`, { timeout: this.config.timeout });
      console.log(`TALQu synthesize command output: ${stdout}`);
      // 生成された音声ファイルを読み込み
      const Buffer = await fs.readFile(tempWavPath);
      // ArrayBufferに変換
      const u8 = new Uint8Array(Buffer);
      const arrayBuffer = u8.buffer;
      // 一時ファイルを削除
      await fs.unlink(tempWavPath).catch((e) => console.error('一時ファイル削除エラー:', e));
      return new AudioResult(arrayBuffer);
    } catch (error) {
      throw new Error(`TALQuでの音声合成に失敗しました: ${error}`);
    }
  }
}

export default Talqu;
