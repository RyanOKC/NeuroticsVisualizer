import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/soundcloud-u07d4zr-.js
var PLAYLIST_PAGE = "https://soundcloud.com/ryanokc/sets/club-neurotics";
function readHydration(html) {
	const start = html.indexOf("window.__sc_hydration = ");
	if (start < 0) throw new Error("SoundCloud page changed.");
	const jsonStart = start + 24;
	if (html[jsonStart] !== "[") throw new Error("SoundCloud page changed.");
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = jsonStart; index < html.length; index += 1) {
		const char = html[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === "\\") escaped = true;
			else if (char === "\"") inString = false;
			continue;
		}
		if (char === "\"") inString = true;
		else if (char === "[") depth += 1;
		else if (char === "]") {
			depth -= 1;
			if (depth === 0) return JSON.parse(html.slice(jsonStart, index + 1));
		}
	}
	throw new Error("SoundCloud page changed.");
}
async function readPlaylist() {
	const response = await fetch(PLAYLIST_PAGE, {
		headers: { "User-Agent": "Mozilla/5.0" },
		signal: AbortSignal.timeout(2e4)
	});
	if (!response.ok) throw new Error("SoundCloud didn't answer.");
	const data = readHydration(await response.text());
	const client = data.find((item) => item.hydratable === "apiClient")?.data;
	const playlist = data.find((item) => item.hydratable === "playlist")?.data;
	if (!client?.id || !playlist?.tracks?.length) throw new Error("Club Neurotics didn't list any songs.");
	return {
		clientId: client.id,
		tracks: playlist.tracks
	};
}
var loadClub_createServerFn_handler = createServerRpc({
	id: "5454a7341e01c88d3b4b49823134b4ae53a0356257f190a23d2840ca6e17b61e",
	name: "loadClub",
	filename: "src/lib/soundcloud.ts"
}, (opts) => loadClub.__executeServer(opts));
var loadClub = createServerFn({ method: "POST" }).handler(loadClub_createServerFn_handler, async () => {
	try {
		const { tracks } = await readPlaylist();
		const songs = tracks.filter((track) => track.id && track.title).map((track) => ({
			id: String(track.id),
			title: String(track.title)
		}));
		if (songs.length === 0) return {
			ok: false,
			error: "Club Neurotics didn't list any songs."
		};
		return {
			ok: true,
			title: "Club Neurotics",
			tracks: songs
		};
	} catch {
		return {
			ok: false,
			error: "Club Neurotics didn't load. Your other songs still play."
		};
	}
});
function asTrackId(input) {
	if (typeof input !== "string" || !/^\d{5,20}$/.test(input)) throw new Error("Unknown song.");
	return input;
}
var openStream_createServerFn_handler = createServerRpc({
	id: "52f4acd01a0af6c0bb167834a9ddf4427187719bda378124746b43fd025de327",
	name: "openStream",
	filename: "src/lib/soundcloud.ts"
}, (opts) => openStream.__executeServer(opts));
var openStream = createServerFn({ method: "POST" }).validator(asTrackId).handler(openStream_createServerFn_handler, async ({ data: id }) => {
	try {
		const { clientId, tracks } = await readPlaylist();
		const track = tracks.find((item) => String(item.id) === id);
		const progressive = track?.media?.transcodings?.find((item) => item.format?.protocol === "progressive" && item.format.mime_type === "audio/mpeg" && item.url);
		if (!track || !progressive?.url) return {
			ok: false,
			error: "That song has no stream."
		};
		const endpoint = new URL(progressive.url);
		if (endpoint.hostname !== "api-v2.soundcloud.com") return {
			ok: false,
			error: "That song has no stream."
		};
		endpoint.searchParams.set("client_id", clientId);
		if (track.track_authorization) endpoint.searchParams.set("track_authorization", track.track_authorization);
		const stream = await fetch(endpoint, {
			headers: {
				Accept: "application/json",
				"User-Agent": "Mozilla/5.0"
			},
			signal: AbortSignal.timeout(2e4)
		});
		if (!stream.ok) return {
			ok: false,
			error: "SoundCloud wouldn't open that song."
		};
		const body = await stream.json();
		if (!body.url) return {
			ok: false,
			error: "SoundCloud wouldn't open that song."
		};
		const media = new URL(body.url);
		if (media.hostname !== "cf-media.sndcdn.com" || media.protocol !== "https:") return {
			ok: false,
			error: "SoundCloud wouldn't open that song."
		};
		return {
			ok: true,
			url: media.toString()
		};
	} catch {
		return {
			ok: false,
			error: "SoundCloud wouldn't open that song."
		};
	}
});
//#endregion
export { loadClub_createServerFn_handler, openStream_createServerFn_handler };
