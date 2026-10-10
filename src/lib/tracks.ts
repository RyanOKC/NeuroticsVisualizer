export type TrackCool = "blue" | "violet" | "green";

export type Track = {
  id: string;
  title: string;
  src: string;
  cool: TrackCool;
};

export const TRACKS: Track[] = [
  {
    id: "say-it",
    title: "Say It Before You're Ready",
    src: "/tracks/say-it-before-youre-ready.mp3",
    cool: "blue",
  },
  {
    id: "one-day",
    title: "One Day, One Day",
    src: "/tracks/one-day-one-day.mp3",
    cool: "violet",
  },
  {
    id: "gravity",
    title: "My Gravity III",
    src: "/tracks/my-gravity-iii.mp3",
    cool: "blue",
  },
  {
    id: "lmnop",
    title: "LM N O P",
    src: "/tracks/lm-n-o-p.mp3",
    cool: "green",
  },
];
