type ButterchurnCtor = typeof import("butterchurn").default;
type PresetPack = { getPresets(): Record<string, object> };

const STORE = "schema-look";
const PREFERRED = [
  "Flexi, martin + geiss - dedicated to the sherwin maxawow",
  "Flexi - mindblob [shiny mix]",
  "Eo.S. + Zylot - skylight (Stained Glass Majesty mix)",
];

export type Milk = {
  context: AudioContext;
  connect: (audio: HTMLAudioElement) => void;
  tap: () => MediaStreamAudioDestinationNode | null;
  resize: () => void;
  render: (preset: string) => void;
  dispose: () => void;
};

export async function bootMilk(canvas: HTMLCanvasElement) {
  const butterMod = (await import("butterchurn")) as { default: ButterchurnCtor & { default?: ButterchurnCtor } };
  const presetMod = (await import("butterchurn-presets")) as { default: PresetPack };
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
    textureRatio: 1,
  });
  let source: MediaElementAudioSourceNode | null = null;
  let tapNode: MediaStreamAudioDestinationNode | null = null;
  let loaded = "";

  const milk: Milk = {
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
      void context.close();
    },
  };

  return {
    milk,
    names,
    preset,
    save(name: string) {
      const next = names.includes(name) ? name : fallback;
      try {
        localStorage.setItem(STORE, next);
      } catch {
        // The choice still applies for this visit.
      }
      return next;
    },
  };
}

function fit(canvas: HTMLCanvasElement) {
  const box = canvas.getBoundingClientRect();
  const cssW = Math.max(1, box.width);
  const cssH = Math.max(1, box.height);
  const ratio = Math.min(window.devicePixelRatio || 1, cssW < 700 ? 1.25 : 1.5);
  const scale = Math.min(ratio, 1600 / Math.max(cssW, cssH));
  const width = Math.max(1, Math.round(cssW * scale));
  const height = Math.max(1, Math.round(cssH * scale));
  canvas.width = width;
  canvas.height = height;
  return { width, height };
}

function readStored(names: string[], fallback: string) {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw && names.includes(raw)) return raw;
  } catch {
    // Storage can be blocked.
  }
  return fallback;
}
