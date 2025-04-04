// voicevox.ts

export default {
  tts,
};

// 音声合成用のクエリを作成する関数
async function fetchAudioQuery(text: string, speaker: number): Promise<any> {
  const url = `http://localhost:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(
      `API error in VOICEVOX's AudioQuery call: ${response.status}`
    );
  }
  return response.json(); // JSONレスポンスを取得
}

// 音声合成を行う関数
async function fetchAudio(text: string, speaker: number): Promise<ArrayBuffer> {
  // 事前に音声合成用のクエリを作成
  const query = await fetchAudioQuery(text, speaker);

  // 音声合成リクエスト
  const url = `http://localhost:50021/synthesis?speaker=${speaker}`; // speakerを動的に設定
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });
  if (!response.ok) {
    throw new Error(
      `API error in VOICEVOX's SynthesisAudio call: ${response.status}`
    );
  }

  return response.arrayBuffer(); // バイナリデータをArrayBufferとして取得
}

// 音声合成エンドポイント
async function tts(text: string, speaker: number): Promise<ArrayBuffer> {
  const audioData = await fetchAudio(text, speaker);
  return audioData;
}
