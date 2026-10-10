const DB_NAME = "mon-library";
const SONGS = "songs";
const CLIPS = "clips";

export type SavedSong = {
  id: string;
  title: string;
  blob: Blob;
};

export type SavedClip = {
  id: string;
  title: string;
  mime: string;
  created: number;
  blob: Blob;
};

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SONGS)) db.createObjectStore(SONGS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(CLIPS)) db.createObjectStore(CLIPS, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listSongs() {
  const db = await openDb();
  return new Promise<SavedSong[]>((resolve, reject) => {
    const request = db.transaction(SONGS).objectStore(SONGS).getAll();
    request.onsuccess = () => resolve(request.result as SavedSong[]);
    request.onerror = () => reject(request.error);
  });
}

export async function addSong(title: string, blob: Blob) {
  const db = await openDb();
  const song: SavedSong = { id: crypto.randomUUID(), title, blob };
  return new Promise<SavedSong>((resolve, reject) => {
    const request = db.transaction(SONGS, "readwrite").objectStore(SONGS).add(song);
    request.onsuccess = () => resolve(song);
    request.onerror = () => reject(request.error);
  });
}

export async function removeSong(id: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(SONGS, "readwrite").objectStore(SONGS).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function listClips() {
  const db = await openDb();
  return new Promise<SavedClip[]>((resolve, reject) => {
    const request = db.transaction(CLIPS).objectStore(CLIPS).getAll();
    request.onsuccess = () => resolve(request.result as SavedClip[]);
    request.onerror = () => reject(request.error);
  });
}

export async function addClip(title: string, blob: Blob) {
  const db = await openDb();
  const clip: SavedClip = {
    id: crypto.randomUUID(),
    title,
    mime: blob.type || "video/webm",
    created: Date.now(),
    blob,
  };
  return new Promise<SavedClip>((resolve, reject) => {
    const request = db.transaction(CLIPS, "readwrite").objectStore(CLIPS).add(clip);
    request.onsuccess = () => resolve(clip);
    request.onerror = () => reject(request.error);
  });
}

export async function removeClip(id: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(CLIPS, "readwrite").objectStore(CLIPS).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
