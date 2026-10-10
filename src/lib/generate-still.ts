import { createServerFn } from "@tanstack/react-start";
import { buildPrompt, type Brief, type Cool, type Frame, type Place } from "@/lib/spectrum";

const COOLS = new Set<Cool>(["blue", "violet", "green"]);
const PLACES = new Set<Place>(["room", "kitchen", "roadside", "screen"]);
const FRAMES = new Set<Frame>(["album", "wide", "story"]);
const PORTRAIT_MAX = 1_400_000;

type Payload = Brief & { portrait: string };

function asBrief(input: unknown): Payload {
  if (!input || typeof input !== "object") {
    throw new Error("Missing brief.");
  }
  const raw = input as Record<string, unknown>;
  const cool = raw.cool;
  const place = raw.place;
  const frame = raw.frame;
  if (typeof cool !== "string" || !COOLS.has(cool as Cool)) throw new Error("Pick one cool light.");
  if (typeof place !== "string" || !PLACES.has(place as Place)) throw new Error("Pick a place.");
  if (typeof frame !== "string" || !FRAMES.has(frame as Frame)) throw new Error("Pick a frame.");
  if (typeof raw.title !== "string" || raw.title.trim().length === 0) {
    throw new Error("The song needs a title.");
  }
  if (typeof raw.portrait !== "string" || !raw.portrait.startsWith("data:image/")) {
    throw new Error("Set your portrait first. The still is built from you.");
  }
  if (raw.portrait.length > PORTRAIT_MAX) {
    throw new Error("That portrait is too large. Use a smaller photo.");
  }
  const lines = Array.isArray(raw.lines) ? raw.lines.filter((line) => typeof line === "string") : [];
  return {
    title: raw.title,
    lines: lines.slice(0, 3) as string[],
    object: typeof raw.object === "string" ? raw.object : "",
    cool: cool as Cool,
    place: place as Place,
    frame: frame as Frame,
    titleInFrame: raw.titleInFrame === true,
    portrait: raw.portrait,
  };
}

type ImageJson = {
  data?: Array<{ url?: string; b64_json?: string }>;
  url?: string;
  b64_json?: string;
  error?: { message?: string };
};

async function readImage(res: Response): Promise<string> {
  const json = (await res.json()) as ImageJson;
  const b64 = json.data?.[0]?.b64_json ?? json.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;
  const url = json.data?.[0]?.url ?? json.url;
  if (!url) {
    throw new Error(json.error?.message || "No still came back.");
  }
  if (url.startsWith("data:image/")) return url;
  const img = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!img.ok) throw new Error("Could not retrieve the still.");
  const mime = img.headers.get("content-type")?.split(";")[0] || "image/png";
  const buf = Buffer.from(await img.arrayBuffer());
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function requestStill(
  apiKey: string,
  prompt: string,
  portrait: string,
  ratio: string,
  full: boolean,
) {
  const body: Record<string, unknown> = {
    model: "grok-imagine-image-2.0",
    prompt,
    n: 1,
    response_format: "b64_json",
    image: { url: portrait, type: "image_url" },
  };
  if (full) {
    body.aspect_ratio = ratio;
    body.resolution = "1k";
  }
  return fetch("https://api.x.ai/v1/images/edits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
}

export const generateStill = createServerFn({ method: "POST" })
  .validator(asBrief)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Image making is not available in this environment." };
    }
    const prompt = buildPrompt(data);
    const ratio = data.frame === "wide" ? "16:9" : data.frame === "story" ? "9:16" : "1:1";
    let res = await requestStill(apiKey, prompt, data.portrait, ratio, true);
    if (!res.ok && (res.status === 400 || res.status === 404 || res.status >= 500)) {
      res = await requestStill(apiKey, prompt, data.portrait, ratio, false);
    }
    if (!res.ok) {
      let message = `The still failed (${res.status}).`;
      try {
        const err = (await res.json()) as ImageJson;
        if (err.error?.message) message = err.error.message.slice(0, 180);
      } catch {
        // keep the status message
      }
      return { ok: false as const, error: message };
    }
    try {
      const image = await readImage(res);
      return { ok: true as const, image, prompt };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read the still.";
      return { ok: false as const, error: message };
    }
  });
