import voicevox from './services/voicevox';

voicevox
  .tts('こんにちは、世界！', 0)
  .then((audioData: ArrayBuffer) => {
    Bun.write('output.wav', audioData); // 書き込み先のファイル名を指定
  })
  .catch((error: Error) => {
    console.error('Error during TTS:', error);
  });
