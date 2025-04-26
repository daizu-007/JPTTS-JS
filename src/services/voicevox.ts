// src/services/voicevox.ts

import AudioResult from '@/utils/audioResult';

const voicevox = { tts, fetchSpeakers };
export default voicevox;

// 定数定義
const VOICEVOX_API_BASE_URL = 'http://localhost:50021';
const CONTENT_TYPE_JSON = 'application/json';
let cache_speakers: Array<{
  name: string;
  styles: Array<{ name: string; id: number }>;
}> | null = null;

// 音声合成用のクエリを作成する関数
async function fetchAudioQuery(text: string, speaker: number): Promise<any> {
  const url = `${VOICEVOX_API_BASE_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPE_JSON,
    },
  });
  if (!response.ok) {
    throw new Error(`API error in VOICEVOX's AudioQuery call: ${response.status}`);
  }
  return response.json(); // JSONレスポンスを取得
}

// 音声合成を行う関数
async function fetchAudioData(query: any, speaker: number): Promise<ArrayBuffer> {
  const url = `${VOICEVOX_API_BASE_URL}/synthesis?speaker=${speaker}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPE_JSON,
    },
    body: JSON.stringify(query),
  });
  if (!response.ok) {
    throw new Error(`API error in VOICEVOX's SynthesisAudio call: ${response.status}`);
  }
  return response.arrayBuffer(); // バイナリデータをArrayBufferとして取得
}

// 話者のリストを取得する関数
async function fetchSpeakers(
  forceRefresh?: boolean
): Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>> {
  const shouldForceRefresh = forceRefresh ?? false;
  // キャッシュがある場合はそれを返す
  if (cache_speakers !== null && !shouldForceRefresh) {
    return cache_speakers;
  }
  // キャッシュがない場合はAPIを呼び出す
  const url = `${VOICEVOX_API_BASE_URL}/speakers`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': CONTENT_TYPE_JSON,
    },
  });
  if (!response.ok) {
    throw new Error(`API error in VOICEVOX's Speakers call: ${response.status}`);
  }
  const speakersResponse = (await response.json()) as Array<{
    name: string;
    speaker_uuid: string;
    styles: Array<{ name: string; id: number; type: string }>;
    version: string;
    supported_features: { permitted_synthesis_morphing: string };
  }>;
  const speakers: Array<{ name: string; styles: Array<{ name: string; id: number }> }> = [];
  speakersResponse.forEach((speaker) => {
    const styles: Array<{ name: string; id: number }> = [];
    speaker.styles.forEach((style) => {
      styles.push({
        name: style.name,
        id: style.id,
      });
    });
    speakers.push({
      name: speaker.name,
      styles: styles,
    });
  });
  // キャッシュに保存
  cache_speakers = speakers;
  return speakers;
}

// 音声合成エンドポイント
async function tts(text: string, speaker: number): Promise<AudioResult> {
  const audioQuery = await fetchAudioQuery(text, speaker);
  const audioData = await fetchAudioData(audioQuery, speaker);
  return new AudioResult(audioData); // AudioResultクラスのインスタンスを返す
}
