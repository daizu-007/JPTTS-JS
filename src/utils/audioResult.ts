// src/utils/audio.ts
// TTSの結果として返されるクラス

import fs from 'fs/promises';

class AudioResult {
  readonly audioData: ArrayBuffer | null = null;
  readonly text: string | null = null;

  constructor(audioData?: ArrayBuffer) {
    this.audioData = audioData || null;
  }

  // ファイルを保存するメソッド
  async saveToFile(filename: string): Promise<void> {
    if (!this.audioData) {
      throw new Error('Audio data is not available');
    }
    // Node.js環境の場合
    else {
      await fs.writeFile(filename, Buffer.from(this.audioData));
    }
  }
}

export default AudioResult;
