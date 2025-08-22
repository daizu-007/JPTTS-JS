// src/services/assistant-seika.ts

import AudioResult from '../utils/audioResult.js';
import type { ServiceConfig, TTSService } from '@/types/service.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Speakers } from '@/types/speaker.js';

const execPromise = promisify(exec);

// Assistant Seikaのクラス
class AssistantSeika implements TTSService {
  // サービス名
  public serviceName = 'assistant-seika';
  // コンフィグを格納する変数
  private config: ServiceConfig;
  // キャッシュを格納する変数
  private cache_speakers: Speakers | null = null;

  constructor(config: ServiceConfig = {}) {
    this.config = {
      ...config,
    };
  }

  // コンフィグを取得するメソッド
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  // 動作しているか確認する関数
  async checkServiceStatus(): Promise<boolean> {
    try {
      await fs.access(this.config.exePath!);
      // Assistant Seikaではバージョン取得ができない
      try {
        await this.fetchSpeakers();
        return true;
      } catch (error) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // 音声合成を行う関数
  async fetchAudioData(text: string, speaker: string): Promise<ArrayBuffer> {
    const speakerList = await this.fetchSpeakers();
    const tempWavPath = path.join(os.tmpdir(), `talqu_${Date.now()}.wav`);
    try {
      const stdout = await execPromise(`"${this.config.exePath}" -cid ${speaker} -save ${tempWavPath} -t "${text}"`);
      // 生成された音声ファイルを読み込み
      const Buffer = await fs.readFile(tempWavPath);
      // ArrayBufferに変換
      const u8 = new Uint8Array(Buffer);
      const arrayBuffer = u8.buffer;
      // 一時ファイルを削除
      await fs.unlink(tempWavPath).catch((e) => console.error('一時ファイル削除エラー:', e));
      return arrayBuffer;
    } catch (error) {
      throw new Error(`Assistant Seikaでの音声合成に失敗しました: ${error}`);
    }
  }

  // 話者リストを取得
  async fetchSpeakers(forceRefresh = false): Promise<Speakers> {
    if (this.cache_speakers && !forceRefresh) {
      return this.cache_speakers;
    }
    try {
      const { stdout } = await execPromise(`"${this.config.exePath}" -list`);
      // エラーっぽい出力が来た場合はエラーを吐く
      if (stdout.includes('エンドポイントがありませんでした') || stdout.includes('起動していない')) {
        throw new Error(`Assistant Seikaから話者リストを取得できません: ${stdout}`);
      }
      const speakers = this.parseAssistantSeikaOutput(stdout);
      this.cache_speakers = speakers;
      return speakers;
    } catch (error) {
      throw new Error(`Assistant Seikaから話者リストを取得できません: ${error}`);
    }
  }

  // Assistant Seikaの話者一覧の出力を解析する関数
  private parseAssistantSeikaOutput(output: string): Speakers {
    const lines = output.split('\n');
    const speakers: Speakers = [];
    for (const line of lines) {
      // 数字で始まる行（話者データ）を探す
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (match) {
        const cid = match[1]!;
        const speakerName = match[2]!.trim();
        speakers.push({
          name: speakerName,
          uuid: cid, // cidをuuidとして使用
          styles: [{ name: 'デフォルト', uuid: 'default' }],
        });
      }
    }
    return speakers;
  }

  // 音声合成エンドポイント
  async tts(text: string, speaker: string, style: string | undefined): Promise<AudioResult> {
    const speakerList = await this.fetchSpeakers();
    if (!speakerList.some((s) => s.uuid === speaker)) {
      // 利用可能な話者一覧（名前とuuid）をエラーに表示
      const availableSpeakers = speakerList.map((s) => `${s.uuid} (name: ${s.name})`).join(', ');
      throw new Error(`Invalid speaker ID: ${speaker}. Available speakers are: ${availableSpeakers}`);
    }
    const audioData = await this.fetchAudioData(text, speaker);
    return new AudioResult(audioData);
  }
}

export default AssistantSeika;
