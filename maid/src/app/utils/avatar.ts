/** Must match the number of `female-NN.svg` / `male-NN.svg` files in `assets/images/avatars`. */
const AVATARS_PER_SET = 20;

const AVATAR_IDS = ['female', 'male'].flatMap((set) =>
  Array.from(
    { length: AVATARS_PER_SET },
    (_, index) => `${set}-${String(index + 1).padStart(2, '0')}`,
  ),
);

const avatarPath = (avatar: string) => `assets/images/avatars/${avatar}.svg`;

export function avatarOptions(): { id: string; src: string }[] {
  return AVATAR_IDS.map((id) => ({ id, src: avatarPath(id) }));
}

// The default avatar is picked from the whole set by uid, so it is stable for a
// user and says nothing about their role.
export function avatarSrc(uid: string | undefined, chosen?: string): string {
  if (chosen) {
    return avatarPath(chosen);
  }
  let hash = 0;
  for (const char of uid ?? '') {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return avatarPath(AVATAR_IDS[Math.abs(hash) % AVATAR_IDS.length]);
}
