import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Download, ImagePlus, Loader2, Lock, Trash2 } from "lucide-react";
import { AppTabs } from "@/components/app-header";
import { generateStill } from "@/lib/generate-still";
import { COOL, FRAMES, PLACES, type Cool, type Frame, type Place } from "@/lib/spectrum";
import { useStudio, type KeptStill } from "@/lib/studio-store";

type Result = { image: string; prompt: string; frame: Frame; title: string };

const FRAME_CLASS: Record<Frame, string> = {
  album: "aspect-square max-w-xl",
  wide: "aspect-video",
  story: "aspect-9/16 max-w-sm",
};

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useStudio.persist.hasHydrated()) finish();
    return useStudio.persist.onFinishHydration(finish);
  }, []);
  return hydrated;
}

async function fileToPortrait(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 896;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.84);
}

function slug(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "still";
}

export function Studio() {
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

  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const shownPortrait = hydrated ? portrait : null;
  const shownKept = hydrated ? kept : [];

  async function onPortrait(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPortrait(await fileToPortrait(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not use that photo.");
    }
  }

  async function onMake(event: FormEvent) {
    event.preventDefault();
    if (!portrait || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await generateStill({
        data: { title, lines: [...lines], object, cool, place, frame, titleInFrame, portrait },
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult({ image: response.image, prompt: response.prompt, frame, title: title.trim() });
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
        prompt: result.prompt,
      });
    } catch {
      setError("This device is full of stills. Remove one, then keep again.");
    }
  }

  function recall(item: KeptStill) {
    setResult({ image: item.image, prompt: item.prompt, frame: item.frame, title: item.title });
    setError(null);
  }

  const stageFrame = result?.frame ?? frame;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Ministry of Neurotics</p>
        <h1 className="font-display text-4xl leading-none text-balance">Stills</h1>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)_16rem]">
        <form onSubmit={onMake} className="grid gap-5 rounded-2xl border border-line bg-surface p-4">
          <PortraitField portrait={shownPortrait} onFile={onPortrait} />

          <label className="grid gap-2" htmlFor={titleId}>
            <span className="text-xs font-medium tracking-widest text-muted uppercase">Title</span>
            <input
              id={titleId}
              value={hydrated ? title : ""}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              required
              placeholder="Song title"
              className="h-12 rounded-xl border border-line bg-bg px-3 text-fg outline-none focus:border-copper"
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium tracking-widest text-muted uppercase">Lines</legend>
            {([0, 1, 2] as const).map((index) => (
              <input
                key={index}
                value={hydrated ? lines[index] : ""}
                onChange={(event) => setLine(index, event.target.value)}
                maxLength={160}
                placeholder={`Line ${index + 1}`}
                className="h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg outline-none focus:border-copper"
              />
            ))}
          </fieldset>

          <label className="grid gap-2">
            <span className="text-xs font-medium tracking-widest text-muted uppercase">Object</span>
            <input
              value={hydrated ? object : ""}
              onChange={(event) => setObject(event.target.value)}
              maxLength={80}
              placeholder="One thing from the lyric"
              className="h-12 rounded-xl border border-line bg-bg px-3 text-fg outline-none focus:border-copper"
            />
          </label>

          <Choice label="Cool light">
            {(Object.keys(COOL) as Cool[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={cool === key}
                onClick={() => setCool(key)}
                className={chip(cool === key)}
              >
                <span className={`size-2.5 rounded-full ${COOL[key].swatch}`} aria-hidden="true" />
                {COOL[key].label}
              </button>
            ))}
          </Choice>

          <Choice label="Place">
            {(Object.keys(PLACES) as Place[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={place === key}
                onClick={() => setPlace(key)}
                className={chip(place === key)}
              >
                {PLACES[key].label}
              </button>
            ))}
          </Choice>

          <Choice label="Frame">
            {(Object.keys(FRAMES) as Frame[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={frame === key}
                onClick={() => setFrame(key)}
                className={chip(frame === key)}
              >
                {FRAMES[key].label}
              </button>
            ))}
          </Choice>

          <button
            type="button"
            role="switch"
            aria-checked={titleInFrame}
            onClick={() => setTitleInFrame(!titleInFrame)}
            className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line px-3 text-left text-sm"
          >
            <span>Title in the frame</span>
            <span className={titleInFrame ? "text-copper" : "text-muted"}>{titleInFrame ? "On" : "Off"}</span>
          </button>

          <button
            type="submit"
            disabled={!shownPortrait || pending || !title.trim()}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-copper font-medium text-bg disabled:opacity-40"
          >
            {pending ? <Loader2 className="motion-spin size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Making the still" : "Make the still"}
          </button>
          {error ? (
            <p className="text-sm text-pretty text-copper" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-sm text-muted">Each press spends one image. Kept stills stay on this device.</p>
          )}
        </form>

        <section className="grid gap-4" aria-live="polite">
          <div className={`relative mx-auto w-full overflow-hidden rounded-2xl border border-line bg-surface ${FRAME_CLASS[stageFrame]}`}>
            {result ? (
              <img src={result.image} alt={result.title ? `Still for ${result.title}` : "Song still"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="font-display text-3xl text-balance">The still lands here.</p>
                <p className="max-w-xs text-sm text-pretty text-muted">
                  Lock a portrait, name the song, then make one frame.
                </p>
              </div>
            )}
            {stageFrame === "album" && result ? (
              <div className="safe-third">
                <span>Safe center</span>
              </div>
            ) : null}
          </div>

          {result ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onKeep} className="h-11 rounded-xl bg-fg px-4 text-sm font-medium text-bg">
                Keep
              </button>
              <a
                href={result.image}
                download={`${slug(result.title)}-${result.frame}.png`}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm"
              >
                <Download className="size-4" aria-hidden="true" />
                Download
              </a>
            </div>
          ) : null}

          {result ? (
            <details className="rounded-2xl border border-line bg-surface p-4">
              <summary className="cursor-pointer text-sm text-muted">Prompt sent with this still</summary>
              <pre className="mt-3 text-sm whitespace-pre-wrap text-pretty text-fg">{result.prompt}</pre>
            </details>
          ) : null}

          {shownKept.length > 0 ? (
            <div>
              <h2 className="mb-3 text-xs font-medium tracking-widest text-muted uppercase">Kept</h2>
              <ul className="flex gap-3 overflow-x-auto pb-1">
                {shownKept.map((item) => (
                  <li key={item.id} className="w-28 shrink-0">
                    <button type="button" onClick={() => recall(item)} className="block w-full text-left">
                      <img src={item.image} alt="" className="aspect-square w-full rounded-xl object-cover" />
                      <span className="mt-1 block truncate text-xs text-muted">{item.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeKept(item.id)}
                      className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs text-muted"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-4 flex items-center gap-2 text-copper">
            <Lock className="size-4" aria-hidden="true" />
            <h2 className="text-xs font-medium tracking-widest uppercase">Locked look</h2>
          </div>
          <ul className="grid gap-3 text-sm text-pretty text-fg">
            <li>Near-black, human scale. A room, not a poster.</li>
            <li>Copper, amber, and rust on skin. Nothing candy-orange.</li>
            <li>One cool source per song. Blue LED, violet, or sick green.</li>
            <li>One physical object from the lyric.</li>
            <li>You stay recognizable. The portrait is the lock.</li>
            <li>No white studio, skyline, headphones, or robot.</li>
            <li>Album frames keep the subject in the safe center for a phone crop.</li>
          </ul>
        </aside>
      </div>
      <AppTabs current="stills" />
    </main>
  );
}

function chip(active: boolean) {
  return `inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${
    active ? "border-copper bg-surface-2 text-fg" : "border-line text-muted"
  }`;
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-xs font-medium tracking-widest text-muted uppercase">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function PortraitField({
  portrait,
  onFile,
}: {
  portrait: string | null;
  onFile: (file: File | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium tracking-widest text-muted uppercase">Portrait lock</span>
      <label
        htmlFor={id}
        className="flex min-h-36 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-bg p-3"
      >
        {portrait ? (
          <img src={portrait} alt="Your portrait" className="h-24 w-20 rounded-xl object-cover" />
        ) : (
          <span className="flex h-24 w-20 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
        )}
        <span className="text-sm text-pretty text-muted">
          {portrait ? "Replace the portrait. Every still is built from this face." : "Add a photo of you. The still does not exist without it."}
        </span>
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
