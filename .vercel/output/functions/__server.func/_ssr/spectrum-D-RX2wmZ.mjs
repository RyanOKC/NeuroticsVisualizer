//#region node_modules/.nitro/vite/services/ssr/assets/spectrum-D-RX2wmZ.js
var COOL = {
	blue: {
		label: "Blue LED",
		light: "one thin blue LED strip, architectural, and no other cool light",
		swatch: "swatch-blue"
	},
	violet: {
		label: "Violet",
		light: "one contained violet practical, a dim lamp or screen, and no other cool light",
		swatch: "swatch-violet"
	},
	green: {
		label: "Sick green",
		light: "one sick-green practical, an old monitor or a single exit lamp, and no other cool light",
		swatch: "swatch-green"
	}
};
var PLACES = {
	room: {
		label: "Room",
		scene: "a near-black bedroom or living room at night, human scale, lived in, not styled"
	},
	kitchen: {
		label: "Kitchen",
		scene: "a dim kitchen at night, human scale, one warm practical, not a showroom"
	},
	roadside: {
		label: "Roadside",
		scene: "the shoulder of an empty road at night, no skyline, no traffic spectacle"
	},
	screen: {
		label: "Screen",
		scene: "a dark room with a single device, human scale, the screen is not the hero"
	}
};
var FRAMES = {
	album: {
		label: "Album",
		ratio: "1:1",
		note: "Square album frame. Place the face and the single object inside the central third. Outer edges stay dark and quiet so a phone crop still holds."
	},
	wide: {
		label: "Wide",
		ratio: "16:9",
		note: "Widescreen. Subject off center. The room does the rest of the work."
	},
	story: {
		label: "Story",
		ratio: "9:16",
		note: "Vertical frame. Face in the upper middle. The object sits lower. Edges stay quiet."
	}
};
function clean(value, max) {
	return value.replace(/\s+/g, " ").trim().slice(0, max);
}
function buildPrompt(brief) {
	const title = clean(brief.title, 80) || "Untitled";
	const lines = brief.lines.map((line) => clean(line, 160)).filter(Boolean);
	const object = clean(brief.object, 80);
	const lyric = lines.length ? lines.map((line) => `“${line}”`).join("\n") : "No lyric lines were given. Keep the scene specific anyway.";
	const thing = object ? `The one object is ${object}. It is physical, specific, and in the room. Nothing else competes with it.` : "Choose one concrete physical object implied by the lines. If nothing is implied, use one ordinary object already in that place. No symbols, logos, or floating icons.";
	const lettering = brief.titleInFrame ? `The only text is the title “${title}”, small, in the lower third, quiet, not a slogan.` : "No text, no letters, no captions, no logos, no watermarks.";
	return [
		"Photoreal cinematic still for a serious independent record. Shot like album photography, not a poster and not a cartoon.",
		"The person in the reference image is the subject. Preserve their face, age, hair, beard, and identity. Do not swap in a model. Do not smooth them younger. Do not add a second person.",
		`Setting: ${PLACES[brief.place].scene}.`,
		`Light: warm copper, amber, and rust only on skin and nearby surfaces. The cool light is exactly this: ${COOL[brief.cool].light}. No daylight. No white studio. No neon skyline.`,
		thing,
		`The song is “${title}”. Honor these lines as situation, not as lettering:`,
		lyric,
		FRAMES[brief.frame].note,
		lettering,
		"Forbidden: headphones, robots, stock-photo smile, beauty lighting, collage, gradient blobs."
	].join("\n\n");
}
//#endregion
export { buildPrompt as i, FRAMES as n, PLACES as r, COOL as t };
