import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as createServerFn } from "./ssr.mjs";
import { a as Plus, i as SkipBack, o as Play, r as SkipForward, s as Pause } from "../_libs/lucide-react.mjs";
import { t as createSsrRpc } from "./createSsrRpc-C1p7zOu_.mjs";
import { n as Muxer, t as ArrayBufferTarget } from "../_libs/mp4-muxer.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-7F89nWfN.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DB_NAME = "mon-library";
var SONGS = "songs";
var CLIPS = "clips";
function openDb() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 2);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(SONGS)) db.createObjectStore(SONGS, { keyPath: "id" });
			if (!db.objectStoreNames.contains(CLIPS)) db.createObjectStore(CLIPS, { keyPath: "id" });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}
async function listSongs() {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const request = db.transaction(SONGS).objectStore(SONGS).getAll();
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}
async function addSong(title, blob) {
	const db = await openDb();
	const song = {
		id: crypto.randomUUID(),
		title,
		blob
	};
	return new Promise((resolve, reject) => {
		const request = db.transaction(SONGS, "readwrite").objectStore(SONGS).add(song);
		request.onsuccess = () => resolve(song);
		request.onerror = () => reject(request.error);
	});
}
async function removeSong(id) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const request = db.transaction(SONGS, "readwrite").objectStore(SONGS).delete(id);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}
async function listClips() {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const request = db.transaction(CLIPS).objectStore(CLIPS).getAll();
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}
async function addClip(title, blob) {
	const db = await openDb();
	const clip = {
		id: crypto.randomUUID(),
		title,
		mime: blob.type || "video/webm",
		created: Date.now(),
		blob
	};
	return new Promise((resolve, reject) => {
		const request = db.transaction(CLIPS, "readwrite").objectStore(CLIPS).add(clip);
		request.onsuccess = () => resolve(clip);
		request.onerror = () => reject(request.error);
	});
}
async function removeClip(id) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const request = db.transaction(CLIPS, "readwrite").objectStore(CLIPS).delete(id);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}
function trackProcessor(track) {
	const ctor = globalThis.MediaStreamTrackProcessor;
	if (!ctor) throw new Error("This browser can't write an MP4.");
	return new ctor({ track });
}
function canEncodeMp4() {
	return typeof VideoEncoder !== "undefined" && typeof AudioEncoder !== "undefined" && "MediaStreamTrackProcessor" in globalThis;
}
function even(size) {
	return Math.max(2, size - size % 2);
}
function frameSize(width, height) {
	return {
		width: even(width),
		height: even(height)
	};
}
async function openMp4Recorder(videoTrack, audioTrack, width, height) {
	const channels = audioTrack.getSettings().channelCount || 2;
	const sampleRate = audioTrack.getSettings().sampleRate || 48e3;
	const videoConfig = {
		codec: "avc1.42001f",
		width,
		height,
		bitrate: 25e5,
		avc: { format: "avc" }
	};
	const audioConfig = {
		codec: "mp4a.40.2",
		numberOfChannels: channels,
		sampleRate,
		bitrate: 128e3
	};
	const videoSupport = await VideoEncoder.isConfigSupported(videoConfig);
	const audioSupport = await AudioEncoder.isConfigSupported(audioConfig);
	if (!videoSupport.supported || !audioSupport.supported) throw new Error("This browser can't write an MP4.");
	const target = new ArrayBufferTarget();
	const muxer = new Muxer({
		target,
		video: {
			codec: "avc",
			width,
			height,
			frameRate: 30
		},
		audio: {
			codec: "aac",
			numberOfChannels: channels,
			sampleRate
		},
		fastStart: "in-memory",
		firstTimestampBehavior: "offset"
	});
	let failed = null;
	const videoEncoder = new VideoEncoder({
		output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
		error: (error) => {
			failed = error;
		}
	});
	const audioEncoder = new AudioEncoder({
		output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
		error: (error) => {
			failed = error;
		}
	});
	videoEncoder.configure(videoConfig);
	audioEncoder.configure(audioConfig);
	const videoReader = trackProcessor(videoTrack).readable.getReader();
	const audioReader = trackProcessor(audioTrack).readable.getReader();
	let stopped = false;
	let frames = 0;
	const pump = async (reader, encode) => {
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
		} catch {}
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
	return { async stop() {
		if (stopped) return new Blob();
		stopped = true;
		await videoReader.cancel().catch(() => void 0);
		await audioReader.cancel().catch(() => void 0);
		await Promise.all([videoPump, audioPump]);
		if (videoTrack.readyState === "live") videoTrack.stop();
		if (failed) throw failed instanceof Error ? failed : /* @__PURE__ */ new Error("The video encoder failed.");
		if (videoEncoder.state === "configured") await videoEncoder.flush();
		if (audioEncoder.state === "configured") await audioEncoder.flush();
		videoEncoder.close();
		audioEncoder.close();
		muxer.finalize();
		return new Blob([target.buffer], { type: "video/mp4" });
	} };
}
var loadClub = createServerFn({ method: "POST" }).handler(createSsrRpc("5454a7341e01c88d3b4b49823134b4ae53a0356257f190a23d2840ca6e17b61e"));
function asTrackId(input) {
	if (typeof input !== "string" || !/^\d{5,20}$/.test(input)) throw new Error("Unknown song.");
	return input;
}
var openStream = createServerFn({ method: "POST" }).validator(asTrackId).handler(createSsrRpc("52f4acd01a0af6c0bb167834a9ddf4427187719bda378124746b43fd025de327"));
var TRACKS = [
	{
		id: "say-it",
		title: "Say It Before You're Ready",
		src: "/tracks/say-it-before-youre-ready.mp3",
		cool: "blue"
	},
	{
		id: "one-day",
		title: "One Day, One Day",
		src: "/tracks/one-day-one-day.mp3",
		cool: "violet"
	},
	{
		id: "gravity",
		title: "My Gravity III",
		src: "/tracks/my-gravity-iii.mp3",
		cool: "blue"
	},
	{
		id: "lmnop",
		title: "LM N O P",
		src: "/tracks/lm-n-o-p.mp3",
		cool: "green"
	}
];
var FEATURED = [
	["Mindblob", "Flexi - mindblob [shiny mix]"],
	["Sherwin", "Flexi, martin + geiss - dedicated to the sherwin maxawow"],
	["Pearl", "cope + martin - mother-of-pearl"],
	["Cauldron", "Geiss - Cauldron - painterly 2 (saturation remix)"],
	["Skylight", "Eo.S. + Zylot - skylight (Stained Glass Majesty mix)"],
	["Witchcraft", "fiShbRaiN + Flexi - witchcraft 2.0"],
	["Arrows", "Martin - liquid arrows"],
	["Vort", "Goody - The Wild Vort"]
];
function clock(seconds) {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const whole = Math.floor(seconds);
	return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, "0")}`;
}
var MIME_TYPES = [
	"video/mp4",
	"video/webm;codecs=vp9,opus",
	"video/webm;codecs=vp8,opus",
	"video/webm"
];
function fileTitle(name) {
	return name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim().slice(0, 80) || "Untitled";
}
function clipFilename(title, mime) {
	return `${title.replace(/[\\/:*?"<>|]+/g, "").trim() || "visual"}.${mime.includes("mp4") ? "mp4" : "webm"}`;
}
function savePicker() {
	return window.showSaveFilePicker;
}
async function saveToDevice(clip) {
	const name = clipFilename(clip.title, clip.mime);
	const ext = name.endsWith(".mp4") ? ".mp4" : ".webm";
	const picker = savePicker();
	if (picker) try {
		const writable = await (await picker({
			suggestedName: name,
			types: [{
				description: "Video",
				accept: { [clip.mime || "video/mp4"]: [ext] }
			}]
		})).createWritable();
		await writable.write(clip.blob);
		await writable.close();
		return;
	} catch (err) {
		if (err instanceof DOMException && err.name === "AbortError") return;
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
function Visualizer() {
	const audioRef = (0, import_react.useRef)(null);
	const stageRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	const stampRef = (0, import_react.useRef)(null);
	const recorderRef = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	const mountedRef = (0, import_react.useRef)(true);
	const milkRef = (0, import_react.useRef)(null);
	const presetRef = (0, import_react.useRef)("");
	const saveRef = (0, import_react.useRef)((name) => name);
	const [trackId, setTrackId] = (0, import_react.useState)(TRACKS[0]?.id ?? "");
	const [playing, setPlaying] = (0, import_react.useState)(false);
	const [time, setTime] = (0, import_react.useState)(0);
	const [duration, setDuration] = (0, import_react.useState)(0);
	const [error, setError] = (0, import_react.useState)(null);
	const [query, setQuery] = (0, import_react.useState)("");
	const [names, setNames] = (0, import_react.useState)([]);
	const [preset, setPreset] = (0, import_react.useState)("");
	const [autoplay, setAutoplay] = (0, import_react.useState)(true);
	const [chrome, setChrome] = (0, import_react.useState)(true);
	const [cloud, setCloud] = (0, import_react.useState)([]);
	const [owned, setOwned] = (0, import_react.useState)([]);
	const [sheet, setSheet] = (0, import_react.useState)(null);
	const [clips, setClips] = (0, import_react.useState)([]);
	const [recording, setRecording] = (0, import_react.useState)(false);
	const trackIdRef = (0, import_react.useRef)(trackId);
	const autoplayRef = (0, import_react.useRef)(true);
	const advancing = (0, import_react.useRef)(false);
	const playlistRef = (0, import_react.useRef)([]);
	presetRef.current = preset;
	trackIdRef.current = trackId;
	autoplayRef.current = autoplay;
	const playlist = (0, import_react.useMemo)(() => {
		const studio = TRACKS.map((item) => ({
			id: item.id,
			title: item.title,
			src: item.src,
			owned: false,
			cloud: false
		}));
		return [
			...cloud,
			...studio,
			...owned
		];
	}, [cloud, owned]);
	playlistRef.current = playlist;
	const track = playlist.find((item) => item.id === trackId) ?? playlist[0];
	const shown = names.filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()));
	const looks = FEATURED.filter(([, name]) => names.includes(name));
	const presetLabel = looks.find(([, name]) => name === preset)?.[0] ?? (preset || "Look");
	(0, import_react.useEffect)(() => {
		const stage = stageRef.current;
		if (!stage) return;
		const canvas = document.createElement("canvas");
		canvas.className = "absolute inset-0 h-full w-full";
		canvas.setAttribute("aria-hidden", "true");
		canvasRef.current = canvas;
		stage.prepend(canvas);
		let alive = true;
		let frame = 0;
		let milk = null;
		let shownError = "";
		const observer = new ResizeObserver(() => milk?.resize());
		import("./milk-DQnwgtBc.mjs").then(async (mod) => {
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
		}).catch((err) => {
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
	(0, import_react.useEffect)(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		try {
			if (localStorage.getItem("mon-autoplay") === "0") setAutoplay(false);
		} catch {}
	}, []);
	(0, import_react.useEffect)(() => {
		let dead = false;
		listSongs().then((rows) => {
			if (dead) return;
			setOwned(rows.map((row) => ({
				id: row.id,
				title: row.title,
				src: URL.createObjectURL(row.blob),
				owned: true,
				cloud: false
			})));
		}).catch(() => {});
		return () => {
			dead = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		let dead = false;
		const urls = [];
		listClips().then((rows) => {
			if (dead) return;
			setClips((current) => {
				const known = new Set(current.map((item) => item.id));
				const fresh = rows.filter((row) => !known.has(row.id)).map((row) => {
					const url = URL.createObjectURL(row.blob);
					urls.push(url);
					return {
						...row,
						url
					};
				});
				return [...current, ...fresh].sort((a, b) => b.created - a.created);
			});
		}).catch(() => {});
		return () => {
			dead = true;
			urls.forEach((url) => URL.revokeObjectURL(url));
		};
	}, []);
	(0, import_react.useEffect)(() => {
		return () => {
			playlistRef.current.forEach((song) => {
				if (song.owned) URL.revokeObjectURL(song.src);
			});
		};
	}, []);
	(0, import_react.useEffect)(() => {
		let dead = false;
		loadClub().then((result) => {
			if (dead || !result.ok) {
				if (!dead && !result.ok) setError(result.error);
				return;
			}
			const songs = result.tracks.map((item) => ({
				id: `sc-${item.id}`,
				title: item.title,
				src: "",
				owned: false,
				cloud: true
			}));
			setCloud(songs);
			setTrackId((current) => current === TRACKS[0]?.id ? songs[0]?.id ?? current : current);
		});
		return () => {
			dead = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!chrome) return;
		const onKey = (event) => {
			if (event.key === "Escape") setChrome(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [chrome]);
	function choosePreset(name) {
		const saved = saveRef.current(name);
		presetRef.current = saved;
		setPreset(saved);
		setError(null);
	}
	function step(direction) {
		const list = shown.length > 0 ? shown : names;
		if (list.length === 0) return;
		const next = list[(Math.max(0, list.indexOf(preset)) + direction + list.length) % list.length];
		if (next) choosePreset(next);
	}
	function readyFor(song, audio) {
		if (!audio.src || audio.src === window.location.href) return false;
		if (song.cloud) return audio.src.includes("sndcdn.com");
		return audio.src.includes(song.src);
	}
	async function streamSrc(song) {
		if (!song.cloud) return song.src;
		const result = await openStream({ data: song.id.slice(3) });
		if (!result.ok) throw new Error(result.error);
		return result.url;
	}
	function keepClip(title, blob) {
		if (!mountedRef.current) return;
		if (blob.size < 1e3) {
			setError("The recording was empty. Press record again.");
			return;
		}
		addClip(title, blob).then((clip) => {
			if (!mountedRef.current) return;
			const url = URL.createObjectURL(clip.blob);
			setClips((list) => [{
				...clip,
				url
			}, ...list]);
			setChrome(true);
			setSheet("clips");
			setError(null);
		}).catch(() => {
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
		(async () => {
			if (!readyFor(current, audio)) await choose(current.id, true);
			const liveAudio = audioRef.current;
			const liveMilk = milkRef.current;
			const liveCanvas = canvasRef.current;
			if (!liveAudio || !liveMilk || !liveCanvas) return;
			liveMilk.connect(liveAudio);
			liveMilk.context.resume();
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
			if (canEncodeMp4()) try {
				const session = await openMp4Recorder(picture, voice, size.width, size.height);
				recorderRef.current = { stop() {
					stampRef.current = null;
					session.stop().then((blob) => keepClip(title, blob)).catch(() => {
						setError("The recording couldn't be finished. Press record again.");
					});
				} };
				setRecording(true);
				setError(null);
				if (liveAudio.paused) liveAudio.play().catch(() => {
					setPlaying(false);
					setError("The browser held the sound. Press play again.");
				});
				return;
			} catch (err) {
				console.error(err);
			}
			if (typeof MediaRecorder === "undefined") {
				stampRef.current = null;
				setError("This browser can't save a video.");
				return;
			}
			if (voice) stream.addTrack(voice);
			const mime = pickMime();
			let rec;
			try {
				rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
			} catch {
				stampRef.current = null;
				setError("This browser can't save a video.");
				return;
			}
			const chunks = [];
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
			if (liveAudio.paused) liveAudio.play().catch(() => {
				setPlaying(false);
				setError("The browser held the sound. Press play again.");
			});
		})().catch((cause) => {
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
			choose(current.id, true);
			return;
		}
		milk.connect(audio);
		milk.context.resume();
		audio.play().then(() => setPlaying(true)).catch(() => {
			setPlaying(false);
			setError("The browser held the sound. Press play again.");
		});
	}
	async function choose(id, keepPlaying = false) {
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
		if (next.cloud) try {
			src = await streamSrc(next);
		} catch (cause) {
			advancing.current = false;
			setError(cause instanceof Error ? cause.message : "SoundCloud wouldn't open that song.");
			return;
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
				milk.context.resume();
			}
			audio.play().then(() => setPlaying(true)).catch(() => {
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
	function skip(direction) {
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
		const next = list[((index < 0 ? 0 : index) + direction + list.length) % list.length];
		if (next) choose(next.id, !audio.paused);
	}
	function finish() {
		if (recorderRef.current) stopRecord();
		if (!audioRef.current || !autoplayRef.current) {
			setPlaying(false);
			return;
		}
		const list = playlistRef.current;
		const next = list[list.findIndex((item) => item.id === trackIdRef.current) + 1];
		if (!next) {
			setPlaying(false);
			return;
		}
		choose(next.id, true);
	}
	function setRunOn(next) {
		autoplayRef.current = next;
		setAutoplay(next);
		try {
			localStorage.setItem("mon-autoplay", next ? "1" : "0");
		} catch {}
	}
	function hideChrome() {
		setSheet(null);
		setChrome(false);
		if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
	}
	async function onFile(event) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file || file.size === 0) return;
		try {
			const saved = await addSong(fileTitle(file.name), file);
			setOwned((list) => [...list, {
				id: saved.id,
				title: saved.title,
				src: URL.createObjectURL(saved.blob),
				owned: true,
				cloud: false
			}]);
		} catch {
			setError("That song couldn't be saved on this device.");
		}
	}
	async function dropSong(id) {
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
		if (trackIdRef.current === id && next) choose(next.id);
	}
	async function dropClip(id) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh overflow-hidden bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: stageRef,
				className: "absolute inset-0"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
				ref: audioRef,
				crossOrigin: "anonymous",
				preload: "metadata",
				onTimeUpdate: (event) => setTime(event.currentTarget.currentTime),
				onLoadedMetadata: (event) => setDuration(event.currentTarget.duration),
				onEnded: () => finish(),
				onPlay: () => setPlaying(true),
				onPause: () => {
					if (!advancing.current) setPlaying(false);
				}
			}),
			chrome ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "stage-title pointer-events-none absolute inset-x-0 top-0 z-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-widest text-muted uppercase",
					children: "Ministry of Neurotics"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "max-w-xs truncate font-display text-3xl leading-none text-fg",
					children: track.title
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "player-sheet",
				children: [
					sheet === "songs" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-fg",
								children: "Playlist"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "grid max-h-64 gap-1 overflow-y-auto",
								children: playlist.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => void choose(item.id),
										"aria-current": item.id === track.id ? "true" : void 0,
										className: `min-h-11 min-w-0 flex-1 truncate rounded-xl px-3 text-left text-sm ${item.id === track.id ? "bg-surface-2 text-fg" : "text-muted"}`,
										children: item.title
									}), item.owned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => void dropSong(item.id),
										className: "h-11 rounded-xl px-3 text-sm text-muted",
										children: "Remove"
									}) : null]
								}, item.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-pretty text-muted",
								children: "Club Neurotics plays from SoundCloud. Songs you add stay on this device. Record saves the picture only, named after the song."
							})
						]
					}) : null,
					sheet === "look" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => step(-1),
									className: "h-11 flex-1 rounded-full border border-line text-sm text-fg",
									children: "Previous look"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => step(1),
									className: "h-11 flex-1 rounded-full border border-line text-sm text-fg",
									children: "Next look"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "grid grid-cols-2 gap-2",
								children: looks.map(([label, name]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": name === preset,
									onClick: () => choosePreset(name),
									className: `h-11 w-full rounded-full border px-3 text-sm ${name === preset ? "border-copper bg-surface text-fg" : "border-line text-muted"}`,
									children: label
								}) }, name))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: query,
								onChange: (event) => setQuery(event.target.value),
								placeholder: "Search looks",
								"aria-label": "Search looks",
								className: "h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg outline-none focus:border-copper"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "grid max-h-40 gap-1 overflow-y-auto",
								children: shown.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": name === preset,
									onClick: () => choosePreset(name),
									className: `min-h-11 w-full rounded-xl px-3 text-left text-sm ${name === preset ? "bg-surface-2 text-fg" : "text-muted"}`,
									children: name
								}) }, name))
							})
						]
					}) : null,
					sheet === "clips" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-fg",
								children: "Recordings"
							}),
							clips.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Nothing here yet. Press Record, then Stop."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "grid max-h-64 gap-3 overflow-y-auto",
								children: clips.map((clip) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "grid gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-sm text-fg",
											children: clipFilename(clip.title, clip.mime)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
											src: clip.url,
											controls: true,
											playsInline: true,
											className: "max-h-40 w-full rounded-xl bg-bg"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
												href: clip.url,
												download: clipFilename(clip.title, clip.mime),
												onClick: (event) => {
													if (typeof savePicker() !== "function") return;
													event.preventDefault();
													saveToDevice(clip);
												},
												className: "inline-flex h-11 flex-1 items-center justify-center rounded-full bg-copper text-sm text-bg",
												children: "Download"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => void dropClip(clip.id),
												className: "h-11 rounded-full border border-line px-3 text-sm text-muted",
												children: "Remove"
											})]
										})
									]
								}, clip.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-pretty text-muted",
								children: "Download saves a normal video file named after the song. It lands in Downloads or Files, not the camera roll."
							})
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-center text-sm text-muted tabular-nums",
						children: [
							Math.max(0, playlist.findIndex((item) => item.id === track.id)) + 1,
							" of ",
							playlist.length
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-center gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => skip(-1),
								"aria-label": "Previous song",
								className: "inline-flex size-12 items-center justify-center rounded-full border border-line text-fg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipBack, {
									className: "size-5",
									"aria-hidden": "true"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => toggle(),
								"aria-label": playing ? "Pause" : "Play",
								className: "inline-flex size-16 items-center justify-center rounded-full bg-copper text-bg",
								children: playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {
									className: "size-6",
									"aria-hidden": "true"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
									className: "size-6",
									"aria-hidden": "true"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => skip(1),
								"aria-label": "Next song",
								className: "inline-flex size-12 items-center justify-center rounded-full border border-line text-fg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, {
									className: "size-5",
									"aria-hidden": "true"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-10 text-sm text-muted tabular-nums",
								children: clock(time)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "h-11 min-w-0 flex-1 accent-copper",
								type: "range",
								min: 0,
								max: duration || 0,
								step: .1,
								value: Math.min(time, duration || 0),
								"aria-label": "Position",
								onChange: (event) => {
									const next = Number(event.target.value);
									const audio = audioRef.current;
									if (audio) audio.currentTime = next;
									setTime(next);
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-10 text-right text-sm text-muted tabular-nums",
								children: clock(duration)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-expanded": sheet === "songs",
							onClick: () => setSheet((value) => value === "songs" ? null : "songs"),
							className: `h-11 rounded-full border text-sm ${sheet === "songs" ? "border-copper bg-surface text-fg" : "border-line text-fg"}`,
							children: "Playlist"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => fileRef.current?.click(),
							className: "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line text-sm text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Add a song"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": recording,
								onClick: () => recording ? stopRecord() : startRecord(),
								className: `h-11 rounded-full text-sm ${recording ? "bg-copper text-bg" : "border border-copper text-fg"}`,
								children: recording ? "Stop" : "Record"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-expanded": sheet === "look",
								onClick: () => setSheet((value) => value === "look" ? null : "look"),
								className: "h-11 truncate rounded-full border border-line px-3 text-sm text-fg",
								children: presetLabel
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: hideChrome,
								className: "h-11 rounded-full border border-line text-sm text-fg",
								children: "Full screen"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": autoplay,
								onClick: () => setRunOn(!autoplay),
								className: `h-11 text-sm ${autoplay ? "text-fg" : "text-muted"}`,
								children: autoplay ? "Autoplay on" : "Autoplay off"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/stills",
								className: "inline-flex h-11 items-center text-sm text-muted",
								children: "Stills"
							}),
							recording ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-copper",
								children: "Recording the picture"
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-expanded": sheet === "clips",
								onClick: () => setSheet((value) => value === "clips" ? null : "clips"),
								className: `h-11 text-sm ${sheet === "clips" ? "text-fg" : "text-muted"}`,
								children: ["Recordings", clips.length > 0 ? ` · ${clips.length}` : ""]
							})
						]
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-copper",
						role: "alert",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: "audio/*",
						className: "sr-only",
						onChange: (event) => void onFile(event)
					})
				]
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Show controls",
				onClick: () => setChrome(true),
				className: "absolute inset-0 z-40 cursor-pointer bg-transparent"
			}), recording ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: stopRecord,
				className: "absolute top-4 right-4 z-50 h-11 rounded-full bg-copper px-4 text-sm text-bg",
				children: "Stop"
			}) : null] })
		]
	});
}
var SplitComponent = Visualizer;
//#endregion
export { SplitComponent as component };
