import crypto from "crypto";
import { CookieOptions, Request, Response } from "express";
import config from "../endpoints.config";
import { getRedisConnection } from "../databases/redis/redis";

const COOKIE_NAME = "linpura_captcha";
const TTL_MS = 3 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const WIDTH = 372;
const HEIGHT = 72;
const CELL = 4;
const GLYPH_WIDTH = 5 * CELL;
const GLYPH_HEIGHT = 7 * CELL;
const GAP = 8;
const GLYPH_SPAN = 5 * GLYPH_WIDTH + 4 * GAP;

const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
};

type CaptchaPayload = {
  answer: string;
  nonce: string;
  exp: number;
};

// Only used when Redis is not configured, which means a single process.
const consumed = new Map<string, number>();

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax",
  path: "/",
  maxAge: TTL_MS,
});

const encryptionKey = () =>
  crypto.createHash("sha256").update(config.sessionSecret).digest();

const purgeConsumed = () => {
  const now = Date.now();
  consumed.forEach((exp, nonce) => {
    if (exp <= now) {
      consumed.delete(nonce);
    }
  });
  if (consumed.size > 5000) {
    consumed.clear();
  }
};

// Returns false if the nonce was already used.
const markConsumed = async (nonce: string, exp: number) => {
  const redis = getRedisConnection();
  if (redis) {
    const result = await redis.set(
      `captcha-used:${nonce}`,
      "1",
      "PX",
      Math.max(exp - Date.now(), 1),
      "NX",
    );
    return result === "OK";
  }
  purgeConsumed();
  if (consumed.has(nonce)) {
    return false;
  }
  consumed.set(nonce, exp);
  return true;
};

const normalize = (value: string) =>
  value.replace(/\s+/g, "").toUpperCase().slice(0, 8);

const asBytes = (value: Buffer) => value as unknown as Uint8Array;

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(asBytes(leftBuffer), asBytes(rightBuffer));
};

const seal = (payload: CaptchaPayload) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    asBytes(encryptionKey()),
    asBytes(iv),
  );
  const ciphertext = Buffer.concat([
    asBytes(
      cipher.update(JSON.stringify(payload), "utf8") as unknown as Buffer,
    ),
    asBytes(cipher.final() as unknown as Buffer),
  ] as unknown as Uint8Array[]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
};

const unseal = (token: string): CaptchaPayload | null => {
  const [ivPart, tagPart, dataPart] = token.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    return null;
  }
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      asBytes(encryptionKey()),
      asBytes(Buffer.from(ivPart, "base64url")),
    );
    decipher.setAuthTag(asBytes(Buffer.from(tagPart, "base64url")));
    const json = Buffer.concat([
      asBytes(
        decipher.update(
          asBytes(Buffer.from(dataPart, "base64url")),
        ) as unknown as Buffer,
      ),
      asBytes(decipher.final() as unknown as Buffer),
    ] as unknown as Uint8Array[]).toString("utf8");
    const payload = JSON.parse(json) as CaptchaPayload;
    if (
      typeof payload.answer !== "string" ||
      typeof payload.nonce !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const generateCode = () => {
  let code = "";
  for (let index = 0; index < 5; index++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
};

const glyphMarkup = (character: string, index: number) => {
  const rows = GLYPHS[character];
  const originX = (WIDTH - GLYPH_SPAN) / 2 + index * (GLYPH_WIDTH + GAP);
  const originY = (HEIGHT - GLYPH_HEIGHT) / 2 + (crypto.randomInt(0, 9) - 4);
  const rotation = crypto.randomInt(0, 29) - 14;
  const centerX = originX + GLYPH_WIDTH / 2;
  const centerY = originY + GLYPH_HEIGHT / 2;
  const fill = "rgb(42,36,40)";
  const rects = rows
    .map((row, rowIndex) =>
      row
        .split("")
        .map((bit, columnIndex) => {
          if (bit !== "1") {
            return "";
          }
          const x = originX + columnIndex * CELL;
          const y = originY + rowIndex * CELL;
          return `<rect x="${x}" y="${y}" width="${CELL - 0.6}" height="${CELL - 0.6}" fill="${fill}"/>`;
        })
        .join(""),
    )
    .join("");
  return `<g transform="rotate(${rotation} ${centerX} ${centerY})">${rects}</g>`;
};

const renderSvg = (code: string) => {
  const glyphs = code
    .split("")
    .map((character, index) => glyphMarkup(character, index))
    .join("");
  const lines = Array.from({ length: 5 }, () => {
    return `<line x1="${crypto.randomInt(0, WIDTH)}" y1="${crypto.randomInt(0, HEIGHT)}" x2="${crypto.randomInt(0, WIDTH)}" y2="${crypto.randomInt(0, HEIGHT)}" stroke="rgb(186,166,156)" stroke-width="1.2"/>`;
  }).join("");
  const dots = Array.from({ length: 22 }, () => {
    return `<rect x="${crypto.randomInt(0, WIDTH)}" y="${crypto.randomInt(0, HEIGHT)}" width="2" height="2" fill="rgb(196,180,170)"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none" style="display:block;width:100%;height:100%"><rect width="${WIDTH}" height="${HEIGHT}" fill="rgb(246,241,234)"/>${lines}${dots}${glyphs}</svg>`;
};

export const createCaptchaChallenge = () => {
  const answer = generateCode();
  const payload: CaptchaPayload = {
    answer,
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Date.now() + TTL_MS,
  };
  return {
    answer,
    token: seal(payload),
    image: renderSvg(answer),
  };
};

export const verifyCaptchaToken = async (
  token: string | undefined,
  rawAnswer: string,
) => {
  if (!token) {
    return false;
  }
  const payload = unseal(token);
  if (!payload || payload.exp <= Date.now()) {
    return false;
  }
  if (!(await markConsumed(payload.nonce, payload.exp))) {
    return false;
  }
  return safeEqual(normalize(payload.answer), normalize(rawAnswer));
};

export const attachCaptcha = (res: Response) => {
  const challenge = createCaptchaChallenge();
  res.cookie(COOKIE_NAME, challenge.token, cookieOptions());
  res.set("Cache-Control", "no-store");
  return challenge.image;
};

export const verifyCaptcha = (
  req: Request,
  res: Response,
  rawAnswer: string,
) => {
  const token = (
    req.cookies as Record<string, string | undefined> | undefined
  )?.[COOKIE_NAME];
  res.clearCookie(COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
  });
  return verifyCaptchaToken(token, rawAnswer);
};
