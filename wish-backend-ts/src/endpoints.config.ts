import * as dotenv from "dotenv";

dotenv.config();

const parseList = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

const defaultCorsOrigins = [
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://localhost:4102",
  "http://localhost:4201",
  "http://localhost:4200",
  "http://127.0.0.1",
  "https://linpura.com",
  "https://www.linpura.com",
];

const corsOrigins = parseList(process.env.CORS_ORIGINS);

const preferWww = (value: string) =>
  value.replace(/^(https?:\/\/)linpura\.com(?=\/|$)/, "$1www.linpura.com");

export default {
  AWSAccessKeyId: process.env.AWSAccessKeyId ?? "",
  AWSSecretKey: process.env.AWSSecretKey ?? "",
  AWSBucketName: process.env.AWSBucketName ?? "",
  // Selfies must not be publicly readable; the main bucket currently is.
  AWSVerificationBucketName:
    process.env.AWS_VERIFICATION_BUCKET || process.env.AWSBucketName || "",
  environment: process.env.environment ?? "development",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: preferWww(
    process.env.GOOGLE_REDIRECT_URI ??
      "http://localhost:4102/api/users/google/callback",
  ),
  mailgunApiKey: process.env.MAILGUN_API_KEY ?? "",
  mailgunDomain: process.env.MAILGUN_DOMAIN ?? "",
  mailgunApiUrl: process.env.MAILGUN_API_URL ?? "https://api.mailgun.net",
  emailfrom: process.env.emailfrom ?? "Linpura <noreply@linpura.com>",
  returnUrlEmail: preferWww(process.env.returnUrlEmail ?? ""),
  mongoUrl: process.env.MONGO_URL ?? "mongodb://172.17.0.1:27017/",
  mongoDb: process.env.MONGO_DB ?? "maiditt",
  corsOrigins: corsOrigins.length ? corsOrigins : defaultCorsOrigins,
  sessionSecret: process.env.SESSION_SECRET ?? "tiag0",
  moderatorEmails: parseList(process.env.MODERATOR_EMAILS).map((email) =>
    email.toLowerCase(),
  ),
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : isProduction,
  webauthnRpName: "Linpura",
  webauthnRpId:
    process.env.WEBAUTHN_RP_ID ?? (isProduction ? "linpura.com" : "localhost"),
  webauthnOrigins: parseList(process.env.WEBAUTHN_ORIGINS).length
    ? parseList(process.env.WEBAUTHN_ORIGINS)
    : isProduction
      ? ["https://www.linpura.com", "https://linpura.com"]
      : [
          "http://localhost:4102",
          "http://127.0.0.1:4102",
          "http://localhost:4200",
          "http://127.0.0.1:4200",
        ],
};
