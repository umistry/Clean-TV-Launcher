// The wallpaper photos, shown in a shuffled order so every one appears before any repeats.
export const PHOTOS = [
  "norway-fjord",
  "green-aurora",
  "forest-valley",
  "forest-waterfall",
  "blue-mountains",
  "sea-sunset",
  "alpine-peak",
  "golden-hills",
  "mountain-lake",
  "sea-cave",
  "sand-dune",
  "city-dusk",
  "aurora-pines",
  "bamboo-forest",
  "autumn-mountains",
] as const;

export const photoUrl = (name: string) => "assets/photos/" + name + ".jpg";
export const clipUrl = (name: string) => "assets/photos/" + name + ".mp4";

const STORAGE_KEY = "aerotizen.photos.v1";

interface Rotation {
  readonly at: number;
  readonly order: readonly string[];
}

type PhotoStorage = Pick<Storage, "getItem" | "setItem">;

const shuffled = (random: () => number) =>
  PHOTOS.map((name) => ({ name, rank: random() }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ name }) => name);

const isValid = (value: Rotation | null): value is Rotation =>
  Boolean(value) &&
  Array.isArray(value?.order) &&
  typeof value?.at === "number" &&
  value.order.length === PHOTOS.length &&
  PHOTOS.every((name) => value.order.includes(name));

const read = (storage: PhotoStorage | null) => {
  try {
    const saved = storage && (JSON.parse(storage.getItem(STORAGE_KEY) || "null") as Rotation | null);
    return saved && isValid(saved) ? saved : null;
  } catch {
    return null;
  }
};

// The position survives restarts, so turning the TV on always moves to a new photo.
export const createPhotoRotation = (storage: PhotoStorage | null, random: () => number = Math.random) => {
  let rotation = read(storage) || { at: -1, order: shuffled(random) };
  const advance = () => {
    const at = rotation.at + 1;
    if (at < rotation.order.length) {
      rotation = { at, order: rotation.order };
    } else {
      // A new order must not begin with the photo that was just on screen.
      const last = rotation.order[rotation.order.length - 1];
      const order = shuffled(random);
      rotation = { at: 0, order: order[0] === last ? [...order.slice(1), last] : order };
    }
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(rotation));
    } catch {
      /* storage full or blocked: the order still advances for this session */
    }
    return rotation.order[rotation.at];
  };
  const peek = () => rotation.order[(rotation.at + 1) % rotation.order.length];
  return { advance, peek };
};
