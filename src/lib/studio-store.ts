import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cool, Frame, Place } from "@/lib/spectrum";

export type KeptStill = {
  id: string;
  title: string;
  frame: Frame;
  cool: Cool;
  image: string;
  prompt: string;
  createdAt: number;
};

type StudioState = {
  title: string;
  lines: [string, string, string];
  object: string;
  cool: Cool;
  place: Place;
  frame: Frame;
  titleInFrame: boolean;
  portrait: string | null;
  kept: KeptStill[];
  setTitle: (value: string) => void;
  setLine: (index: 0 | 1 | 2, value: string) => void;
  setObject: (value: string) => void;
  setCool: (value: Cool) => void;
  setPlace: (value: Place) => void;
  setFrame: (value: Frame) => void;
  setTitleInFrame: (value: boolean) => void;
  setPortrait: (value: string | null) => void;
  keep: (still: Omit<KeptStill, "id" | "createdAt">) => void;
  removeKept: (id: string) => void;
};

const MAX_KEPT = 6;

export const useStudio = create<StudioState>()(
  persist(
    (set) => ({
      title: "",
      lines: ["", "", ""],
      object: "",
      cool: "blue",
      place: "room",
      frame: "album",
      titleInFrame: false,
      portrait: null,
      kept: [],
      setTitle: (title) => set({ title }),
      setLine: (index, value) =>
        set((state) => {
          const lines = [...state.lines] as [string, string, string];
          lines[index] = value;
          return { lines };
        }),
      setObject: (object) => set({ object }),
      setCool: (cool) => set({ cool }),
      setPlace: (place) => set({ place }),
      setFrame: (frame) => set({ frame }),
      setTitleInFrame: (titleInFrame) => set({ titleInFrame }),
      setPortrait: (portrait) => set({ portrait }),
      keep: (still) =>
        set((state) => ({
          kept: [
            { ...still, id: crypto.randomUUID(), createdAt: Date.now() },
            ...state.kept,
          ].slice(0, MAX_KEPT),
        })),
      removeKept: (id) => set((state) => ({ kept: state.kept.filter((item) => item.id !== id) })),
    }),
    { name: "schema-studio-v1" },
  ),
);
