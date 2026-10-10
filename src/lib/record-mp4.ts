import { ArrayBufferTarget, Muxer } from "mp4-muxer";

type TrackProcessor<T> = {
  readable: ReadableStream<T>;
};

function trackProcessor<T>(track: MediaStreamTrack) {
  const ctor = (globalThis as unknown as {
    MediaStreamTrackProcessor?: new (init: { track: MediaStreamTrack }) => TrackProcessor<T>;
  }).MediaStreamTrackProcessor;
  if (!ctor) throw new Error("This browser can't write an MP4.");
  return new ctor({ track });
}

export function canEncodeMp4() {
  return (
    typeof VideoEncoder !== "undefined" &&
    typeof AudioEncoder !== "undefined" &&
    "MediaStreamTrackProcessor" in globalThis
  );
}

function even(size: number) {
  return Math.max(2, size - (size % 2));
}

export function frameSize(width: number, height: number) {
  return { width: even(width), height: even(height) };
}

export async function openMp4Recorder(videoTrack: MediaStreamTrack, audioTrack: MediaStreamTrack, width: number, height: number) {
  const channels = audioTrack.getSettings().channelCount || 2;
  const sampleRate = audioTrack.getSettings().sampleRate || 48000;
  const videoConfig: VideoEncoderConfig = {
    codec: "avc1.42001f",
    width,
    height,
    bitrate: 2_500_000,
    avc: { format: "avc" },
  };
  const audioConfig: AudioEncoderConfig = {
    codec: "mp4a.40.2",
    numberOfChannels: channels,
    sampleRate,
    bitrate: 128_000,
  };
  const videoSupport = await VideoEncoder.isConfigSupported(videoConfig);
  const audioSupport = await AudioEncoder.isConfigSupported(audioConfig);
  if (!videoSupport.supported || !audioSupport.supported) {
    throw new Error("This browser can't write an MP4.");
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width, height, frameRate: 30 },
    audio: { codec: "aac", numberOfChannels: channels, sampleRate },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  let failed: unknown = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      failed = error;
    },
  });
  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (error) => {
      failed = error;
    },
  });
  videoEncoder.configure(videoConfig);
  audioEncoder.configure(audioConfig);

  const videoReader = trackProcessor<VideoFrame>(videoTrack).readable.getReader();
  const audioReader = trackProcessor<AudioData>(audioTrack).readable.getReader();
  let stopped = false;
  let frames = 0;

  const pump = async <T extends VideoFrame | AudioData>(
    reader: ReadableStreamDefaultReader<T>,
    encode: (value: T) => void,
  ) => {
    try {
      while (!stopped) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        try {
          encode(value);
        } finally {
          value.close();
        }
      }
    } catch {
      // Cancelling the reader ends the pump.
    }
  };

  const videoPump = pump(videoReader, (frame) => {
    if (failed || videoEncoder.encodeQueueSize > 8) return;
    videoEncoder.encode(frame, { keyFrame: frames % 30 === 0 });
    frames += 1;
  });
  const audioPump = pump(audioReader, (data) => {
    if (failed || audioEncoder.state === "closed") return;
    audioEncoder.encode(data);
  });

  return {
    async stop() {
      if (stopped) return new Blob();
      stopped = true;
      await videoReader.cancel().catch(() => undefined);
      await audioReader.cancel().catch(() => undefined);
      await Promise.all([videoPump, audioPump]);
      if (videoTrack.readyState === "live") videoTrack.stop();
      if (failed) throw failed instanceof Error ? failed : new Error("The video encoder failed.");
      if (videoEncoder.state === "configured") await videoEncoder.flush();
      if (audioEncoder.state === "configured") await audioEncoder.flush();
      videoEncoder.close();
      audioEncoder.close();
      muxer.finalize();
      return new Blob([target.buffer], { type: "video/mp4" });
    },
  };
}
