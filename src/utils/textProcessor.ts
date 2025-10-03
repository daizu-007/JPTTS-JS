// src/utils/textProcessor.ts
class TextProcessor {
  // テキストを処理するメインのエンドポイント
  processText(text: string): string[] {
    const result = this.splitText(text);
    const cleanedResult = result.map((sentence) => this.removeUnsupportedChars(sentence));
    return cleanedResult;
  }
  // テキストを文ごとに分割する関数
  private splitText(text: string): string[] {
    return text
      .split(/([。.！？!\?\n])/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  // TTSできない文字を除去する関数
  private removeUnsupportedChars(text: string): string {
    return text.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');
  }
}
export default TextProcessor;
