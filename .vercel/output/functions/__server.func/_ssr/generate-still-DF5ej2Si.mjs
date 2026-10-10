import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { i as buildPrompt } from "./spectrum-D-RX2wmZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/generate-still-DF5ej2Si.js
var COOLS = /* @__PURE__ */ new Set([
	"blue",
	"violet",
	"green"
]);
var PLACES = /* @__PURE__ */ new Set([
	"room",
	"kitchen",
	"roadside",
	"screen"
]);
var FRAMES = /* @__PURE__ */ new Set([
	"album",
	"wide",
	"story"
]);
var PORTRAIT_MAX = 14e5;
function asBrief(input) {
	if (!input || typeof input !== "object") throw new Error("Missing brief.");
	const raw = input;
	const cool = raw.cool;
	const place = raw.place;
	const frame = raw.frame;
	if (typeof cool !== "string" || !COOLS.has(cool)) throw new Error("Pick one cool light.");
	if (typeof place !== "string" || !PLACES.has(place)) throw new Error("Pick a place.");
	if (typeof frame !== "string" || !FRAMES.has(frame)) throw new Error("Pick a frame.");
	if (typeof raw.title !== "string" || raw.title.trim().length === 0) throw new Error("The song needs a title.");
	if (typeof raw.portrait !== "string" || !raw.portrait.startsWith("data:image/")) throw new Error("Set your portrait first. The still is built from you.");
	if (raw.portrait.length > PORTRAIT_MAX) throw new Error("That portrait is too large. Use a smaller photo.");
	const lines = Array.isArray(raw.lines) ? raw.lines.filter((line) => typeof line === "string") : [];
	return {
		title: raw.title,
		lines: lines.slice(0, 3),
		object: typeof raw.object === "string" ? raw.object : "",
		cool,
		place,
		frame,
		titleInFrame: raw.titleInFrame === true,
		portrait: raw.portrait
	};
}
async function readImage(res) {
	const json = await res.json();
	const b64 = json.data?.[0]?.b64_json ?? json.b64_json;
	if (b64) return `data:image/png;base64,${b64}`;
	const url = json.data?.[0]?.url ?? json.url;
	if (!url) throw new Error(json.error?.message || "No still came back.");
	if (url.startsWith("data:image/")) return url;
	const img = await fetch(url, { signal: AbortSignal.timeout(3e4) });
	if (!img.ok) throw new Error("Could not retrieve the still.");
	return `data:${img.headers.get("content-type")?.split(";")[0] || "image/png"};base64,${Buffer.from(await img.arrayBuffer()).toString("base64")}`;
}
async function requestStill(apiKey, prompt, portrait, ratio, full) {
	const body = {
		model: "grok-imagine-image-2.0",
		prompt,
		n: 1,
		response_format: "b64_json",
		image: {
			url: portrait,
			type: "image_url"
		}
	};
	if (full) {
		body.aspect_ratio = ratio;
		body.resolution = "1k";
	}
	return fetch("https://api.x.ai/v1/images/edits", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(12e4)
	});
}
var generateStill_createServerFn_handler = createServerRpc({
	id: "14657724f7cd8059e16461ecbcaa4f75dd6d93f84555f91383f680dd96fa84a7",
	name: "generateStill",
	filename: "src/lib/generate-still.ts"
}, (opts) => generateStill.__executeServer(opts));
var generateStill = createServerFn({ method: "POST" }).validator(asBrief).handler(generateStill_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "Image making is not available in this environment."
	};
	const prompt = buildPrompt(data);
	const ratio = data.frame === "wide" ? "16:9" : data.frame === "story" ? "9:16" : "1:1";
	let res = await requestStill(apiKey, prompt, data.portrait, ratio, true);
	if (!res.ok && (res.status === 400 || res.status === 404 || res.status >= 500)) res = await requestStill(apiKey, prompt, data.portrait, ratio, false);
	if (!res.ok) {
		let message = `The still failed (${res.status}).`;
		try {
			const err = await res.json();
			if (err.error?.message) message = err.error.message.slice(0, 180);
		} catch {}
		return {
			ok: false,
			error: message
		};
	}
	try {
		return {
			ok: true,
			image: await readImage(res),
			prompt
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Could not read the still."
		};
	}
});
//#endregion
export { generateStill_createServerFn_handler };
