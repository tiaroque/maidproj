import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import config from "../endpoints.config";

const GOOGLE_SCOPES = ["openid", "email", "profile"];

export type OauthPkceCookie = {
  state: string;
  codeVerifier: string;
  lang: string;
};

export const oauthPkceCookieName = "oauth_pkce";

export const getGoogleOAuthClient = () => {
  if (!config.googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is missing");
  }
  if (!config.googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is missing");
  }
  return new OAuth2Client(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
};

export const createPkce = () => {
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { state, codeVerifier, codeChallenge };
};

export const buildGoogleAuthUrl = (
  client: OAuth2Client,
  state: string,
  codeChallenge: string
) => {
  return client.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
    // google-auth-library forwards unknown options to the query string
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  } as Parameters<OAuth2Client["generateAuthUrl"]>[0]);
};

export const hashResetToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createResetToken = () => crypto.randomBytes(32).toString("hex");
