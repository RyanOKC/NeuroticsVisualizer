import { i as __toESM } from "../_runtime.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/milk-DQnwgtBc.js
var STORE = "schema-look";
var PREFERRED = [
	"Flexi, martin + geiss - dedicated to the sherwin maxawow",
	"Flexi - mindblob [shiny mix]",
	"Eo.S. + Zylot - skylight (Stained Glass Majesty mix)"
];
async function bootMilk(canvas) {
	const butterMod = await import("../_libs/butterchurn.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
	const presetMod = await import("../_libs/butterchurn-presets.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
	const Butterchurn = typeof butterMod.default.createVisualizer === "function" ? butterMod.default : butterMod.default.default;
	if (!Butterchurn) throw new Error("Butterchurn did not load.");
	const presets = presetMod.default.getPresets();
	const names = Object.keys(presets);
	const fallback = PREFERRED.find((name) => names.includes(name)) ?? names[0] ?? "";
	const preset = readStored(names, fallback);
	const context = new AudioContext();
	const first = fit(canvas);
	const visualizer = Butterchurn.createVisualizer(context, canvas, {
		width: first.width,
		height: first.height,
		pixelRatio: 1,
		textureRatio: 1
	});
	let source = null;
	let tapNode = null;
	let loaded = "";
	return {
		milk: {
			context,
			connect(audio) {
				if (source) return;
				source = context.createMediaElementSource(audio);
				source.connect(context.destination);
				visualizer.connectAudio(source);
			},
			tap() {
				if (!source) return null;
				if (!tapNode) {
					tapNode = context.createMediaStreamDestination();
					source.connect(tapNode);
				}
				return tapNode;
			},
			resize() {
				const next = fit(canvas);
				visualizer.setRendererSize(next.width, next.height, { pixelRatio: 1 });
			},
			render(name) {
				const chosen = presets[name] ? name : fallback;
				if (chosen !== loaded && presets[chosen]) {
					visualizer.loadPreset(presets[chosen], loaded ? 1.2 : 0);
					loaded = chosen;
				}
				visualizer.render();
			},
			dispose() {
				context.close();
			}
		},
		names,
		preset,
		save(name) {
			const next = names.includes(name) ? name : fallback;
			try {
				localStorage.setItem(STORE, next);
			} catch {}
			return next;
		}
	};
}
function fit(canvas) {
	const box = canvas.getBoundingClientRect();
	const cssW = Math.max(1, box.width);
	const cssH = Math.max(1, box.height);
	const ratio = Math.min(window.devicePixelRatio || 1, cssW < 700 ? 1.25 : 1.5);
	const scale = Math.min(ratio, 1600 / Math.max(cssW, cssH));
	const width = Math.max(1, Math.round(cssW * scale));
	const height = Math.max(1, Math.round(cssH * scale));
	canvas.width = width;
	canvas.height = height;
	return {
		width,
		height
	};
}
function readStored(names, fallback) {
	try {
		const raw = localStorage.getItem(STORE);
		if (raw && names.includes(raw)) return raw;
	} catch {}
	return fallback;
}
//#endregion
export { bootMilk };
