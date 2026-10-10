import { createServerFn } from "@tanstack/react-start";

const PLAYLIST_PAGE = "https://soundcloud.com/ryanokc/sets/club-neurotics";

export type CloudTrack = {
  id: string;
  title: string;
};

type Hydration = { hydratable?: string; data?: unknown };

type CloudMedia = {
  id?: number;
  title?: string;
  track_authorization?: string;
  media?: {
    transcodings?: Array<{
      url?: string;
      format?: { protocol?: string; mime_type?: string };
    }>;
  };
};

function readHydration(html: string) {
  const marker = "window.__sc_hydration = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("SoundCloud page changed.");
  const jsonStart = start + marker.length;
  if (html[jsonStart] !== "[") throw new Error("SoundCloud page changed.");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(jsonStart, index + 1)) as Hydration[];
    }
  }
  throw new Error("SoundCloud page changed.");
}

async function readPlaylist() {
  const response = await fetch(PLAYLIST_PAGE, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("SoundCloud didn't answer.");
  const data = readHydration(await response.text());
  const client = data.find((item) => item.hydratable === "apiClient")?.data as { id?: string } | undefined;
  const playlist = data.find((item) => item.hydratable === "playlist")?.data as { tracks?: CloudMedia[] } | undefined;
  if (!client?.id || !playlist?.tracks?.length) throw new Error("Club Neurotics didn't list any songs.");
  return { clientId: client.id, tracks: playlist.tracks };
}

export const loadClub = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { tracks } = await readPlaylist();
    const songs: CloudTrack[] = tracks
      .filter((track) => track.id && track.title)
      .map((track) => ({ id: String(track.id), title: String(track.title) }));
    if (songs.length === 0) return { ok: false as const, error: "Club Neurotics didn't list any songs." };
    return { ok: true as const, title: "Club Neurotics", tracks: songs };
  } catch {
    return { ok: false as const, error: "Club Neurotics didn't load. Your other songs still play." };
  }
});

function asTrackId(input: unknown) {
  if (typeof input !== "string" || !/^\d{5,20}$/.test(input)) throw new Error("Unknown song.");
  return input;
}

export const openStream = createServerFn({ method: "POST" })
  .validator(asTrackId)
  .handler(async ({ data: id }) => {
    try {
      const { clientId, tracks } = await readPlaylist();
      const track = tracks.find((item) => String(item.id) === id);
      const progressive = track?.media?.transcodings?.find(
        (item) => item.format?.protocol === "progressive" && item.format.mime_type === "audio/mpeg" && item.url,
      );
      if (!track || !progressive?.url) return { ok: false as const, error: "That song has no stream." };
      const endpoint = new URL(progressive.url);
      if (endpoint.hostname !== "api-v2.soundcloud.com") return { ok: false as const, error: "That song has no stream." };
      endpoint.searchParams.set("client_id", clientId);
      if (track.track_authorization) endpoint.searchParams.set("track_authorization", track.track_authorization);
      const stream = await fetch(endpoint, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!stream.ok) return { ok: false as const, error: "SoundCloud wouldn't open that song." };
      const body = (await stream.json()) as { url?: string };
      if (!body.url) return { ok: false as const, error: "SoundCloud wouldn't open that song." };
      const media = new URL(body.url);
      if (media.hostname !== "cf-media.sndcdn.com" || media.protocol !== "https:") {
        return { ok: false as const, error: "SoundCloud wouldn't open that song." };
      }
      return { ok: true as const, url: media.toString() };
    } catch {
      return { ok: false as const, error: "SoundCloud wouldn't open that song." };
    }
  });
