import { randomInt } from "crypto";

// Ids are translated on the frontend (verification.pose.<id>).
export const VERIFICATION_CHALLENGES = [
  "thumbs_up_left",
  "thumbs_up_right",
  "peace_sign_left",
  "peace_sign_right",
  "touch_nose",
  "hand_on_head",
  "three_fingers",
  "point_at_camera",
] as const;

export type VerificationChallengeId = (typeof VERIFICATION_CHALLENGES)[number];

export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export const pickChallenge = (): VerificationChallengeId =>
  VERIFICATION_CHALLENGES[randomInt(VERIFICATION_CHALLENGES.length)];

export const isChallengeId = (value: unknown): value is VerificationChallengeId =>
  typeof value === "string" &&
  (VERIFICATION_CHALLENGES as readonly string[]).includes(value);
