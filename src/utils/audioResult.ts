// src/utils/audio.ts
// TTSの結果として返されるクラス

class AudioResult {
  private static fs: any = null; // Node.jsのfsモジュールを格納する変数
  readonly audioData: ArrayBuffer | null = null;
  readonly text: string | null = null;

  constructor(audioData?: ArrayBuffer) {
    this.audioData = audioData || null;
  }

  // fsモジュールを管理するメソッド
  private static async getFsModule(): Promise<any> {
    if (!this.fs) {
      const fsModule = await import('fs/promises');
      this.fs = fsModule.default;
    }
    return this.fs;
  }

  // ファイルを保存するメソッド
  async saveToFile(filename: string): Promise<void> {
    if (!this.audioData) {
      throw new Error('Audio data is not available');
    }
    // ブラウザ環境の場合
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      const blob = new Blob([this.audioData]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
    // Bun環境の場合
    else if (typeof Bun !== 'undefined' && Bun.write) {
      await Bun.write(filename, Buffer.from(this.audioData));
    }
    // Node.js環境の場合
    else {
      const fs = await AudioResult.getFsModule();
      await fs.writeFile(filename, Buffer.from(this.audioData));
    }
  }
}

export default AudioResult;
