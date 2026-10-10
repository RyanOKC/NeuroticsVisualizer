import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Play, Plus, SkipBack, SkipForward } from "lucide-react";
import { addClip, addSong, listClips, listSongs, removeClip, removeSong, type SavedClip } from "@/lib/library";
import { canEncodeMp4, frameSize, openMp4Recorder } from "@/lib/record-mp4";
import { loadClub, openStream } from "@/lib/soundcloud";
import { TRACKS } from "@/lib/tracks";

const FEATURED: [label: string, name: string][] = [
  ["Mindblob", "Flexi - mindblob [shiny mix]"],
  ["Sherwin", "Flexi, martin + geiss - dedicated to the sherwin maxawow"],
  ["Pearl", "cope + martin - mother-of-pearl"],
  ["Cauldron", "Geiss - Cauldron - painterly 2 (saturation remix)"],
  ["Skylight", "Eo.S. + Zylot - skylight (Stained Glass Majesty mix)"],
  ["Witchcraft", "fiShbRaiN + Flexi - witchcraft 2.0"],
  ["Arrows", "Martin - liquid arrows"],
  ["Vort", "Goody - The Wild Vort"],
];

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Song = {
  id: string;
  title: string;
  src: string;
  owned: boolean;
  cloud: boolean;
};

const MIME_TYPES = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

function fileTitle(name: string) {
  const bare = name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
  return bare.slice(0, 80) || "Untitled";
}

function clipFilename(title: string, mime: string) {
  const safe = title.replace(/[\\/:*?"<>|]+/g, "").trim() || "visual";
  return `${safe}.${mime.includes("mp4") ? "mp4" : "webm"}`;
}

type ClipView = SavedClip & { url: string };

function savePicker() {
  return (window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  }).showSaveFilePicker;
}

async function saveToDevice(clip: ClipView) {
  const name = clipFilename(clip.title, clip.mime);
  const ext = name.endsWith(".mp4") ? ".mp4" : ".webm";
  const picker = savePicker();
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: name,
        types: [{ description: "Video", accept: { [clip.mime || "video/mp4"]: [ext] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(clip.blob);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }
  const link = document.createElement("a");
  link.href = clip.url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

type MilkHandle = {
  context: AudioContext;
  connect: (audio: HTMLAudioElement) => void;
  tap: () => MediaStreamAudioDestinationNode | null;
  resize: () => void;
  render: (preset: string) => void;
  dispose: () => void;
};

export function Visualizer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stampRef = useRef<((source: HTMLCanvasElement) => void) | null>(null);
  const recorderRef = useRef<{ stop: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const milkRef = useRef<MilkHandle | null>(null);
  const presetRef = useRef("");
  const saveRef = useRef<(name: string) => string>((name) => name);
  const [trackId, setTrackId] = useState(TRACKS[0]?.id ?? "");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [preset, setPreset] = useState("");
  const [autoplay, setAutoplay] = useState(true);
  const [chrome, setChrome] = useState(true);
  const [cloud, setCloud] = useState<Song[]>([]);
  const [owned, setOwned] = useState<Song[]>([]);
  const [sheet, setSheet] = useState<"songs" | "look" | "clips" | null>(null);
  const [clips, setClips] = useState<ClipView[]>([]);
  const [recording, setRecording] = useState(false);
  const trackIdRef = useRef(trackId);
  const autoplayRef = useRef(true);
  const advancing = useRef(false);
  const playlistRef = useRef<Song[]>([]);
  presetRef.current = preset;
  trackIdRef.current = trackId;
  autoplayRef.current = autoplay;
  const playlist = useMemo(() => {
    const studio = TRACKS.map((item) => ({ id: item.id, title: item.title, src: item.src, owned: false, cloud: false }));
    return [...cloud, ...studio, ...owned];
  }, [cloud, owned]);
  playlistRef.current = playlist;
  const track = playlist.find((item) => item.id === trackId) ?? playlist[0];
  const shown = names.filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()));
  const looks = FEATURED.filter(([, name]) => names.includes(name));
  const presetLabel = looks.find(([, name]) => name === preset)?.[0] ?? (preset || "Look");

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    canvas.setAttribute("aria-hidden", "true");
    canvasRef.current = canvas;
    stage.prepend(canvas);
    let alive = true;
    let frame = 0;
    let milk: MilkHandle | null = null;
    let shownError = "";
    const observer = new ResizeObserver(() => milk?.resize());

    void import("@/lib/milk")
      .then(async (mod) => {
        if (!alive) return;
        const ready = await mod.bootMilk(canvas);
        if (!alive) {
          ready.milk.dispose();
          return;
        }
        milk = ready.milk;
        milkRef.current = milk;
        saveRef.current = ready.save;
        setNames(ready.names);
        presetRef.current = ready.preset;
        setPreset(ready.preset);
        observer.observe(stage);
        milk.resize();
        const loop = () => {
          if (!alive || !milk) return;
          try {
            milk.render(presetRef.current);
            stampRef.current?.(canvas);
            if (shownError) {
              shownError = "";
              setError(null);
            }
          } catch (err) {
            console.error(err);
            if (shownError !== "preset") {
              shownError = "preset";
              setError("That look failed. Try the next one.");
            }
          }
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        console.error(err);
        canvas.remove();
        setError("This browser couldn't open the picture.");
      });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      audioRef.current?.pause();
      milk?.dispose();
      milkRef.current = null;
      canvasRef.current = null;
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("mon-autoplay") === "0") setAutoplay(false);
    } catch {
      // The choice still applies for this visit.
    }
  }, []);

  useEffect(() => {
    let dead = false;
    void listSongs()
      .then((rows) => {
        if (dead) return;
        setOwned(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            src: URL.createObjectURL(row.blob),
            owned: true,
            cloud: false,
          })),
        );
      })
      .catch(() => {
        // Built-in songs still play.
      });
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    let dead = false;
    const urls: string[] = [];
    void listClips()
      .then((rows) => {
        if (dead) return;
        setClips((current) => {
          const known = new Set(current.map((item) => item.id));
          const fresh = rows
            .filter((row) => !known.has(row.id))
            .map((row) => {
              const url = URL.createObjectURL(row.blob);
              urls.push(url);
              return { ...row, url };
            });
          return [...current, ...fresh].sort((a, b) => b.created - a.created);
        });
      })
      .catch(() => {
        // Recording still works for this visit.
      });
    return () => {
      dead = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    return () => {
      playlistRef.current.forEach((song) => {
        if (song.owned) URL.revokeObjectURL(song.src);
      });
    };
  }, []);

  useEffect(() => {
    let dead = false;
    void loadClub().then((result) => {
      if (dead || !result.ok) {
        if (!dead && !result.ok) setError(result.error);
        return;
      }
      const songs = result.tracks.map((item) => ({
        id: `sc-${item.id}`,
        title: item.title,
        src: "",
        owned: false,
        cloud: true,
      }));
      setCloud(songs);
      setTrackId((current) => (current === TRACKS[0]?.id ? songs[0]?.id ?? current : current));
    });
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!chrome) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChrome(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chrome]);

  function choosePreset(name: string) {
    const saved = saveRef.current(name);
    presetRef.current = saved;
    setPreset(saved);
    setError(null);
  }

  function step(direction: number) {
    const list = shown.length > 0 ? shown : names;
    if (list.length === 0) return;
    const index = Math.max(0, list.indexOf(preset));
    const next = list[(index + direction + list.length) % list.length];
    if (next) choosePreset(next);
  }

  function readyFor(song: Song, audio: HTMLAudioElement) {
    if (!audio.src || audio.src === window.location.href) return false;
    if (song.cloud) return audio.src.includes("sndcdn.com");
    return audio.src.includes(song.src);
  }

  async function streamSrc(song: Song) {
    if (!song.cloud) return song.src;
    const result = await openStream({ data: song.id.slice(3) });
    if (!result.ok) throw new Error(result.error);
    return result.url;
  }

  function keepClip(title: string, blob: Blob) {
    if (!mountedRef.current) return;
    if (blob.size < 1000) {
      setError("The recording was empty. Press record again.");
      return;
    }
    void addClip(title, blob)
      .then((clip) => {
        if (!mountedRef.current) return;
        const url = URL.createObjectURL(clip.blob);
        setClips((list) => [{ ...clip, url }, ...list]);
        setChrome(true);
        setSheet("clips");
        setError(null);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError("The recording couldn't be kept. Press record again.");
      });
  }

  function stopRecord() {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    setRecording(false);
    rec.stop();
  }

  function startRecord() {
    const milk = milkRef.current;
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const current = playlistRef.current.find((item) => item.id === trackIdRef.current);
    if (!milk || !audio || !canvas || !current) {
      setError("The picture is still opening. Press record again.");
      return;
    }
    if (!canEncodeMp4() && typeof MediaRecorder === "undefined") {
      setError("This browser can't save a video.");
      return;
    }
    void (async () => {
      if (!readyFor(current, audio)) {
        await choose(current.id, true);
      }
      const liveAudio = audioRef.current;
      const liveMilk = milkRef.current;
      const liveCanvas = canvasRef.current;
      if (!liveAudio || !liveMilk || !liveCanvas) return;
      liveMilk.connect(liveAudio);
      void liveMilk.context.resume();
      const dest = liveMilk.tap();
      const voice = dest?.stream.getAudioTracks()[0];
      if (!dest || !voice) {
        setError("The sound isn't ready. Press record again.");
        return;
      }
      const size = frameSize(liveCanvas.width, liveCanvas.height);
      const film = document.createElement("canvas");
      film.width = size.width;
      film.height = size.height;
      const ctx = film.getContext("2d");
      if (!ctx) return;
      stampRef.current = (source) => {
        ctx.drawImage(source, 0, 0, size.width, size.height);
      };
      const stream = film.captureStream(30);
      const picture = stream.getVideoTracks()[0];
      if (!picture) {
        setError("This browser can't save a video.");
        return;
      }
      const title = current.title;
      if (canEncodeMp4()) {
        try {
          const session = await openMp4Recorder(picture, voice, size.width, size.height);
          recorderRef.current = {
            stop() {
              stampRef.current = null;
              void session.stop().then((blob) => keepClip(title, blob)).catch(() => {
                setError("The recording couldn't be finished. Press record again.");
              });
            },
          };
          setRecording(true);
          setError(null);
          if (liveAudio.paused) {
            void liveAudio.play().catch(() => {
              setPlaying(false);
              setError("The browser held the sound. Press play again.");
            });
          }
          return;
        } catch (err) {
          console.error(err);
        }
      }
      if (typeof MediaRecorder === "undefined") {
        stampRef.current = null;
        setError("This browser can't save a video.");
        return;
      }
      if (voice) stream.addTrack(voice);
      const mime = pickMime();
      let rec: MediaRecorder;
      try {
        rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch {
        stampRef.current = null;
        setError("This browser can't save a video.");
        return;
      }
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      rec.onstop = () => {
        stampRef.current = null;
        stream.getVideoTracks().forEach((item) => item.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
        keepClip(title, blob);
      };
      rec.start(250);
      recorderRef.current = rec;
      setRecording(true);
      setError(null);
      if (liveAudio.paused) {
        void liveAudio.play().catch(() => {
          setPlaying(false);
          setError("The browser held the sound. Press play again.");
        });
      }
    })().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "That song wouldn't start.");
    });
  }

  function toggle() {
    const audio = audioRef.current;
    const milk = milkRef.current;
    const current = playlistRef.current.find((item) => item.id === trackIdRef.current);
    if (!audio || !milk || !current) {
      setError("The picture is still opening. Press play again.");
      return;
    }
    setError(null);
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (!readyFor(current, audio)) {
      void choose(current.id, true);
      return;
    }
    milk.connect(audio);
    void milk.context.resume();
    void audio.play().then(() => setPlaying(true)).catch(() => {
      setPlaying(false);
      setError("The browser held the sound. Press play again.");
    });
  }

  async function choose(id: string, keepPlaying = false) {
    const next = playlistRef.current.find((item) => item.id === id);
    const audio = audioRef.current;
    if (!next || !audio) return;
    if (next.id === trackIdRef.current && readyFor(next, audio) && !keepPlaying) {
      setSheet(null);
      return;
    }
    if (recorderRef.current && id !== trackIdRef.current) stopRecord();
    const shouldPlay = keepPlaying || !audio.paused;
    setTrackId(id);
    setError(null);
    setTime(0);
    setSheet(null);
    let src = next.src;
    if (next.cloud) {
      try {
        src = await streamSrc(next);
      } catch (cause) {
        advancing.current = false;
        setError(cause instanceof Error ? cause.message : "SoundCloud wouldn't open that song.");
        return;
      }
    }
    advancing.current = true;
    const start = () => {
      audio.removeEventListener("canplay", start);
      if (!shouldPlay) {
        advancing.current = false;
        setPlaying(false);
        return;
      }
      const milk = milkRef.current;
      if (milk) {
        milk.connect(audio);
        void milk.context.resume();
      }
      void audio.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false);
        setError("The browser held the sound. Press play again.");
      }).finally(() => {
        advancing.current = false;
      });
    };
    if (shouldPlay) audio.addEventListener("canplay", start);
    audio.src = src;
    if (!shouldPlay) {
      advancing.current = false;
      setPlaying(false);
    }
  }

  function skip(direction: number) {
    const audio = audioRef.current;
    const list = playlistRef.current;
    if (!audio || list.length === 0) return;
    const index = list.findIndex((item) => item.id === trackIdRef.current);
    const current = list[index] ?? list[0];
    if (direction < 0 && audio.currentTime > 3 && current && readyFor(current, audio)) {
      audio.currentTime = 0;
      setTime(0);
      return;
    }
    const at = index < 0 ? 0 : index;
    const next = list[(at + direction + list.length) % list.length];
    if (next) void choose(next.id, !audio.paused);
  }

  function finish() {
    if (recorderRef.current) stopRecord();
    const audio = audioRef.current;
    if (!audio || !autoplayRef.current) {
      setPlaying(false);
      return;
    }
    const list = playlistRef.current;
    const index = list.findIndex((item) => item.id === trackIdRef.current);
    const next = list[index + 1];
    if (!next) {
      setPlaying(false);
      return;
    }
    void choose(next.id, true);
  }

  function setRunOn(next: boolean) {
    autoplayRef.current = next;
    setAutoplay(next);
    try {
      localStorage.setItem("mon-autoplay", next ? "1" : "0");
    } catch {
      // The choice still applies for this visit.
    }
  }

  function hideChrome() {
    setSheet(null);
    setChrome(false);
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {
        // The picture is already edge to edge in the page.
      });
    }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || file.size === 0) return;
    try {
      const saved = await addSong(fileTitle(file.name), file);
      setOwned((list) => [
        ...list,
        { id: saved.id, title: saved.title, src: URL.createObjectURL(saved.blob), owned: true, cloud: false },
      ]);
    } catch {
      setError("That song couldn't be saved on this device.");
    }
  }

  async function dropSong(id: string) {
    const song = owned.find((item) => item.id === id);
    try {
      await removeSong(id);
    } catch {
      setError("That song couldn't be removed.");
      return;
    }
    if (song) URL.revokeObjectURL(song.src);
    const next = playlistRef.current.find((item) => item.id !== id);
    setOwned((list) => list.filter((item) => item.id !== id));
    if (trackIdRef.current === id && next) void choose(next.id);
  }

  async function dropClip(id: string) {
    const clip = clips.find((item) => item.id === id);
    try {
      await removeClip(id);
    } catch {
      setError("That recording couldn't be removed.");
      return;
    }
    if (clip) URL.revokeObjectURL(clip.url);
    setClips((list) => list.filter((item) => item.id !== id));
  }

  if (!track) return null;

  return (
    <main className="relative h-dvh overflow-hidden bg-bg">
      <div ref={stageRef} className="absolute inset-0" />
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => finish()}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          if (!advancing.current) setPlaying(false);
        }}
      />
      {chrome ? (
        <>
          <div className="stage-title pointer-events-none absolute inset-x-0 top-0 z-10">
            <p className="text-xs tracking-widest text-muted uppercase">Ministry of Neurotics</p>
            <h1 className="max-w-xs truncate font-display text-3xl leading-none text-fg">{track.title}</h1>
          </div>
          <div className="player-sheet">
          {sheet === "songs" ? (
            <div className="grid gap-2">
              <p className="text-sm text-fg">Playlist</p>
              <ul className="grid max-h-64 gap-1 overflow-y-auto">
                {playlist.map((item) => (
                  <li key={item.id} className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void choose(item.id)}
                      aria-current={item.id === track.id ? "true" : undefined}
                      className={`min-h-11 min-w-0 flex-1 truncate rounded-xl px-3 text-left text-sm ${
                        item.id === track.id ? "bg-surface-2 text-fg" : "text-muted"
                      }`}
                    >
                      {item.title}
                    </button>
                    {item.owned ? (
                      <button type="button" onClick={() => void dropSong(item.id)} className="h-11 rounded-xl px-3 text-sm text-muted">
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-pretty text-muted">
                Club Neurotics plays from SoundCloud. Songs you add stay on this device. Record saves the picture only, named after the song.
              </p>
            </div>
          ) : null}
          {sheet === "look" ? (
            <div className="grid gap-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => step(-1)} className="h-11 flex-1 rounded-full border border-line text-sm text-fg">
                  Previous look
                </button>
                <button type="button" onClick={() => step(1)} className="h-11 flex-1 rounded-full border border-line text-sm text-fg">
                  Next look
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {looks.map(([label, name]) => (
                  <li key={name}>
                    <button
                      type="button"
                      aria-pressed={name === preset}
                      onClick={() => choosePreset(name)}
                      className={`h-11 w-full rounded-full border px-3 text-sm ${
                        name === preset ? "border-copper bg-surface text-fg" : "border-line text-muted"
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search looks"
                aria-label="Search looks"
                className="h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg outline-none focus:border-copper"
              />
              <ul className="grid max-h-40 gap-1 overflow-y-auto">
                {shown.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      aria-pressed={name === preset}
                      onClick={() => choosePreset(name)}
                      className={`min-h-11 w-full rounded-xl px-3 text-left text-sm ${
                        name === preset ? "bg-surface-2 text-fg" : "text-muted"
                      }`}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {sheet === "clips" ? (
            <div className="grid gap-2">
              <p className="text-sm text-fg">Recordings</p>
              {clips.length === 0 ? (
                <p className="text-sm text-muted">Nothing here yet. Press Record, then Stop.</p>
              ) : (
                <ul className="grid max-h-64 gap-3 overflow-y-auto">
                  {clips.map((clip) => (
                    <li key={clip.id} className="grid gap-2">
                      <p className="truncate text-sm text-fg">{clipFilename(clip.title, clip.mime)}</p>
                      <video src={clip.url} controls playsInline className="max-h-40 w-full rounded-xl bg-bg" />
                      <div className="flex gap-2">
                        <a
                          href={clip.url}
                          download={clipFilename(clip.title, clip.mime)}
                          onClick={(event) => {
                            if (typeof savePicker() !== "function") return;
                            event.preventDefault();
                            void saveToDevice(clip);
                          }}
                          className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-copper text-sm text-bg"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          onClick={() => void dropClip(clip.id)}
                          className="h-11 rounded-full border border-line px-3 text-sm text-muted"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-pretty text-muted">
                Download saves a normal video file named after the song. It lands in Downloads or Files, not the camera roll.
              </p>
            </div>
          ) : null}
          <p className="text-center text-sm text-muted tabular-nums">
            {Math.max(0, playlist.findIndex((item) => item.id === track.id)) + 1} of {playlist.length}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => skip(-1)}
              aria-label="Previous song"
              className="inline-flex size-12 items-center justify-center rounded-full border border-line text-fg"
            >
              <SkipBack className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => toggle()}
              aria-label={playing ? "Pause" : "Play"}
              className="inline-flex size-16 items-center justify-center rounded-full bg-copper text-bg"
            >
              {playing ? <Pause className="size-6" aria-hidden="true" /> : <Play className="size-6" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => skip(1)}
              aria-label="Next song"
              className="inline-flex size-12 items-center justify-center rounded-full border border-line text-fg"
            >
              <SkipForward className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-10 text-sm text-muted tabular-nums">{clock(time)}</span>
            <input
              className="h-11 min-w-0 flex-1 accent-copper"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              aria-label="Position"
              onChange={(event) => {
                const next = Number(event.target.value);
                const audio = audioRef.current;
                if (audio) audio.currentTime = next;
                setTime(next);
              }}
            />
            <span className="w-10 text-right text-sm text-muted tabular-nums">{clock(duration)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-expanded={sheet === "songs"}
              onClick={() => setSheet((value) => (value === "songs" ? null : "songs"))}
              className={`h-11 rounded-full border text-sm ${
                sheet === "songs" ? "border-copper bg-surface text-fg" : "border-line text-fg"
              }`}
            >
              Playlist
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line text-sm text-fg"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add a song
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-pressed={recording}
              onClick={() => (recording ? stopRecord() : startRecord())}
              className={`h-11 rounded-full text-sm ${recording ? "bg-copper text-bg" : "border border-copper text-fg"}`}
            >
              {recording ? "Stop" : "Record"}
            </button>
            <button
              type="button"
              aria-expanded={sheet === "look"}
              onClick={() => setSheet((value) => (value === "look" ? null : "look"))}
              className="h-11 truncate rounded-full border border-line px-3 text-sm text-fg"
            >
              {presetLabel}
            </button>
            <button type="button" onClick={hideChrome} className="h-11 rounded-full border border-line text-sm text-fg">
              Full screen
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-pressed={autoplay}
              onClick={() => setRunOn(!autoplay)}
              className={`h-11 text-sm ${autoplay ? "text-fg" : "text-muted"}`}
            >
              {autoplay ? "Autoplay on" : "Autoplay off"}
            </button>
            <Link to="/stills" className="inline-flex h-11 items-center text-sm text-muted">
              Stills
            </Link>
            {recording ? <p className="text-sm text-copper">Recording the picture</p> : null}
            <button
              type="button"
              aria-expanded={sheet === "clips"}
              onClick={() => setSheet((value) => (value === "clips" ? null : "clips"))}
              className={`h-11 text-sm ${sheet === "clips" ? "text-fg" : "text-muted"}`}
            >
              Recordings{clips.length > 0 ? ` · ${clips.length}` : ""}
            </button>
          </div>
          {error ? (
            <p className="text-sm text-copper" role="alert">
              {error}
            </p>
          ) : null}
          <input ref={fileRef} type="file" accept="audio/*" className="sr-only" onChange={(event) => void onFile(event)} />
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            aria-label="Show controls"
            onClick={() => setChrome(true)}
            className="absolute inset-0 z-40 cursor-pointer bg-transparent"
          />
          {recording ? (
            <button
              type="button"
              onClick={stopRecord}
              className="absolute top-4 right-4 z-50 h-11 rounded-full bg-copper px-4 text-sm text-bg"
            >
              Stop
            </button>
          ) : null}
        </>
      )}
    </main>
  );
}
