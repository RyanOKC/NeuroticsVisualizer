import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as createServerFn } from "./ssr.mjs";
import { n as FRAMES$1, r as PLACES$1, t as COOL } from "./spectrum-D-RX2wmZ.mjs";
import { c as Lock, d as ImagePlus, f as Download, l as LoaderCircle, n as Trash2, p as AudioLines, u as Image } from "../_libs/lucide-react.mjs";
import { t as createSsrRpc } from "./createSsrRpc-C1p7zOu_.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/stills-MQPBeSLh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppTabs({ current }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
		className: "tabbar",
		"aria-label": "Studio",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/",
			className: tab(current === "listen"),
			"aria-current": current === "listen" ? "page" : void 0,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AudioLines, {
				className: "size-5",
				"aria-hidden": "true"
			}), "Listen"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/stills",
			className: tab(current === "stills"),
			"aria-current": current === "stills" ? "page" : void 0,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, {
				className: "size-5",
				"aria-hidden": "true"
			}), "Stills"]
		})]
	});
}
function tab(active) {
	return `flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs ${active ? "text-copper" : "text-muted"}`;
}
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
var generateStill = createServerFn({ method: "POST" }).validator(asBrief).handler(createSsrRpc("14657724f7cd8059e16461ecbcaa4f75dd6d93f84555f91383f680dd96fa84a7"));
var MAX_KEPT = 6;
var useStudio = create()(persist((set) => ({
	title: "",
	lines: [
		"",
		"",
		""
	],
	object: "",
	cool: "blue",
	place: "room",
	frame: "album",
	titleInFrame: false,
	portrait: null,
	kept: [],
	setTitle: (title) => set({ title }),
	setLine: (index, value) => set((state) => {
		const lines = [...state.lines];
		lines[index] = value;
		return { lines };
	}),
	setObject: (object) => set({ object }),
	setCool: (cool) => set({ cool }),
	setPlace: (place) => set({ place }),
	setFrame: (frame) => set({ frame }),
	setTitleInFrame: (titleInFrame) => set({ titleInFrame }),
	setPortrait: (portrait) => set({ portrait }),
	keep: (still) => set((state) => ({ kept: [{
		...still,
		id: crypto.randomUUID(),
		createdAt: Date.now()
	}, ...state.kept].slice(0, MAX_KEPT) })),
	removeKept: (id) => set((state) => ({ kept: state.kept.filter((item) => item.id !== id) }))
}), { name: "schema-studio-v1" }));
var FRAME_CLASS = {
	album: "aspect-square max-w-xl",
	wide: "aspect-video",
	story: "aspect-9/16 max-w-sm"
};
function useHydrated() {
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const finish = () => setHydrated(true);
		if (useStudio.persist.hasHydrated()) finish();
		return useStudio.persist.onFinishHydration(finish);
	}, []);
	return hydrated;
}
async function fileToPortrait(file) {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, 896 / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not read that photo.");
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	return canvas.toDataURL("image/jpeg", .84);
}
function slug(title) {
	return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "still";
}
function Studio() {
	const hydrated = useHydrated();
	const title = useStudio((s) => s.title);
	const lines = useStudio((s) => s.lines);
	const object = useStudio((s) => s.object);
	const cool = useStudio((s) => s.cool);
	const place = useStudio((s) => s.place);
	const frame = useStudio((s) => s.frame);
	const titleInFrame = useStudio((s) => s.titleInFrame);
	const portrait = useStudio((s) => s.portrait);
	const kept = useStudio((s) => s.kept);
	const setTitle = useStudio((s) => s.setTitle);
	const setLine = useStudio((s) => s.setLine);
	const setObject = useStudio((s) => s.setObject);
	const setCool = useStudio((s) => s.setCool);
	const setPlace = useStudio((s) => s.setPlace);
	const setFrame = useStudio((s) => s.setFrame);
	const setTitleInFrame = useStudio((s) => s.setTitleInFrame);
	const setPortrait = useStudio((s) => s.setPortrait);
	const keep = useStudio((s) => s.keep);
	const removeKept = useStudio((s) => s.removeKept);
	const [result, setResult] = (0, import_react.useState)(null);
	const [pending, setPending] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const titleId = (0, import_react.useId)();
	const shownPortrait = hydrated ? portrait : null;
	const shownKept = hydrated ? kept : [];
	async function onPortrait(file) {
		if (!file) return;
		setError(null);
		try {
			setPortrait(await fileToPortrait(file));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not use that photo.");
		}
	}
	async function onMake(event) {
		event.preventDefault();
		if (!portrait || pending) return;
		setPending(true);
		setError(null);
		try {
			const response = await generateStill({ data: {
				title,
				lines: [...lines],
				object,
				cool,
				place,
				frame,
				titleInFrame,
				portrait
			} });
			if (!response.ok) {
				setError(response.error);
				return;
			}
			setResult({
				image: response.image,
				prompt: response.prompt,
				frame,
				title: title.trim()
			});
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not make the still.");
		} finally {
			setPending(false);
		}
	}
	function onKeep() {
		if (!result) return;
		try {
			keep({
				title: result.title || "Untitled",
				frame: result.frame,
				cool,
				image: result.image,
				prompt: result.prompt
			});
		} catch {
			setError("This device is full of stills. Remove one, then keep again.");
		}
	}
	function recall(item) {
		setResult({
			image: item.image,
			prompt: item.prompt,
			frame: item.frame,
			title: item.title
		});
		setError(null);
	}
	const stageFrame = result?.frame ?? frame;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-dvh w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-widest text-muted uppercase",
					children: "Ministry of Neurotics"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl leading-none text-balance",
					children: "Stills"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)_16rem]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: onMake,
						className: "grid gap-5 rounded-2xl border border-line bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortraitField, {
								portrait: shownPortrait,
								onFile: onPortrait
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "grid gap-2",
								htmlFor: titleId,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium tracking-widest text-muted uppercase",
									children: "Title"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: titleId,
									value: hydrated ? title : "",
									onChange: (event) => setTitle(event.target.value),
									maxLength: 80,
									required: true,
									placeholder: "Song title",
									className: "h-12 rounded-xl border border-line bg-bg px-3 text-fg outline-none focus:border-copper"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
								className: "grid gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
									className: "text-xs font-medium tracking-widest text-muted uppercase",
									children: "Lines"
								}), [
									0,
									1,
									2
								].map((index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: hydrated ? lines[index] : "",
									onChange: (event) => setLine(index, event.target.value),
									maxLength: 160,
									placeholder: `Line ${index + 1}`,
									className: "h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg outline-none focus:border-copper"
								}, index))]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "grid gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium tracking-widest text-muted uppercase",
									children: "Object"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: hydrated ? object : "",
									onChange: (event) => setObject(event.target.value),
									maxLength: 80,
									placeholder: "One thing from the lyric",
									className: "h-12 rounded-xl border border-line bg-bg px-3 text-fg outline-none focus:border-copper"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Choice, {
								label: "Cool light",
								children: Object.keys(COOL).map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": cool === key,
									onClick: () => setCool(key),
									className: chip(cool === key),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `size-2.5 rounded-full ${COOL[key].swatch}`,
										"aria-hidden": "true"
									}), COOL[key].label]
								}, key))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Choice, {
								label: "Place",
								children: Object.keys(PLACES$1).map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": place === key,
									onClick: () => setPlace(key),
									className: chip(place === key),
									children: PLACES$1[key].label
								}, key))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Choice, {
								label: "Frame",
								children: Object.keys(FRAMES$1).map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": frame === key,
									onClick: () => setFrame(key),
									className: chip(frame === key),
									children: FRAMES$1[key].label
								}, key))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "switch",
								"aria-checked": titleInFrame,
								onClick: () => setTitleInFrame(!titleInFrame),
								className: "flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line px-3 text-left text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Title in the frame" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: titleInFrame ? "text-copper" : "text-muted",
									children: titleInFrame ? "On" : "Off"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								disabled: !shownPortrait || pending || !title.trim(),
								className: "flex h-12 items-center justify-center gap-2 rounded-2xl bg-copper font-medium text-bg disabled:opacity-40",
								children: [pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
									className: "motion-spin size-4 animate-spin",
									"aria-hidden": "true"
								}) : null, pending ? "Making the still" : "Make the still"]
							}),
							error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-pretty text-copper",
								role: "alert",
								children: error
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Each press spends one image. Kept stills stay on this device."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "grid gap-4",
						"aria-live": "polite",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `relative mx-auto w-full overflow-hidden rounded-2xl border border-line bg-surface ${FRAME_CLASS[stageFrame]}`,
								children: [result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: result.image,
									alt: result.title ? `Still for ${result.title}` : "Song still",
									className: "h-full w-full object-cover"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex h-full min-h-64 flex-col items-center justify-center gap-2 px-6 text-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-display text-3xl text-balance",
										children: "The still lands here."
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "max-w-xs text-sm text-pretty text-muted",
										children: "Lock a portrait, name the song, then make one frame."
									})]
								}), stageFrame === "album" && result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "safe-third",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Safe center" })
								}) : null]
							}),
							result ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: onKeep,
									className: "h-11 rounded-xl bg-fg px-4 text-sm font-medium text-bg",
									children: "Keep"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: result.image,
									download: `${slug(result.title)}-${result.frame}.png`,
									className: "inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
										className: "size-4",
										"aria-hidden": "true"
									}), "Download"]
								})]
							}) : null,
							result ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
								className: "rounded-2xl border border-line bg-surface p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
									className: "cursor-pointer text-sm text-muted",
									children: "Prompt sent with this still"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
									className: "mt-3 text-sm whitespace-pre-wrap text-pretty text-fg",
									children: result.prompt
								})]
							}) : null,
							shownKept.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mb-3 text-xs font-medium tracking-widest text-muted uppercase",
								children: "Kept"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "flex gap-3 overflow-x-auto pb-1",
								children: shownKept.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "w-28 shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => recall(item),
										className: "block w-full text-left",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: item.image,
											alt: "",
											className: "aspect-square w-full rounded-xl object-cover"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-1 block truncate text-xs text-muted",
											children: item.title
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => removeKept(item.id),
										className: "mt-1 inline-flex min-h-11 items-center gap-1 text-xs text-muted",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
											className: "size-3.5",
											"aria-hidden": "true"
										}), "Remove"]
									})]
								}, item.id))
							})] }) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "rounded-2xl border border-line bg-surface p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-4 flex items-center gap-2 text-copper",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
								className: "size-4",
								"aria-hidden": "true"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-xs font-medium tracking-widest uppercase",
								children: "Locked look"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "grid gap-3 text-sm text-pretty text-fg",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Near-black, human scale. A room, not a poster." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Copper, amber, and rust on skin. Nothing candy-orange." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "One cool source per song. Blue LED, violet, or sick green." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "One physical object from the lyric." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "You stay recognizable. The portrait is the lock." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "No white studio, skyline, headphones, or robot." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Album frames keep the subject in the safe center for a phone crop." })
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTabs, { current: "stills" })
		]
	});
}
function chip(active) {
	return `inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${active ? "border-copper bg-surface-2 text-fg" : "border-line text-muted"}`;
}
function Choice({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
		className: "grid gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
			className: "text-xs font-medium tracking-widest text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap gap-2",
			children
		})]
	});
}
function PortraitField({ portrait, onFile }) {
	const id = (0, import_react.useId)();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs font-medium tracking-widest text-muted uppercase",
				children: "Portrait lock"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				htmlFor: id,
				className: "flex min-h-36 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-bg p-3",
				children: [portrait ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: portrait,
					alt: "Your portrait",
					className: "h-24 w-20 rounded-xl object-cover"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex h-24 w-20 items-center justify-center rounded-xl bg-surface-2 text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, {
						className: "size-5",
						"aria-hidden": "true"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-pretty text-muted",
					children: portrait ? "Replace the portrait. Every still is built from this face." : "Add a photo of you. The still does not exist without it."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id,
				type: "file",
				accept: "image/*",
				className: "sr-only",
				onChange: (event) => {
					onFile(event.target.files?.[0]);
					event.target.value = "";
				}
			})
		]
	});
}
var SplitComponent = Studio;
//#endregion
export { SplitComponent as component };
