import { readFileSync } from "fs";
import { join } from "path";
import FormData from "form-data";
import Mailgun from "mailgun.js";
import config from "../endpoints.config";

const ICON_CID = "linpura-icon.png";

let iconData: Buffer | null | undefined;

const linpuraIcon = () => {
  if (iconData !== undefined) {
    return iconData;
  }
  try {
    iconData = readFileSync(join(__dirname, "../email-templates", ICON_CID));
  } catch (error) {
    iconData = null;
    console.error("Linpura email icon missing", error);
  }
  return iconData;
};

const mailgun = new Mailgun(FormData);

const client = () =>
  mailgun.client({
    username: "api",
    key: config.mailgunApiKey,
    url: config.mailgunApiUrl,
  });

const sendingDomain = () => {
  const raw = config.mailgunDomain.trim();
  const at = raw.lastIndexOf("@");
  return at >= 0 ? raw.slice(at + 1) : raw;
};

const fromAddress = (domain: string) => {
  const configured = config.emailfrom.trim();
  const match = configured.match(/@([^>\s]+)/);
  if (match?.[1]?.toLowerCase() === domain.toLowerCase()) {
    return configured;
  }
  return `Linpura <postmaster@${domain}>`;
};

export const sendEmail = (to: string, html: string, subject = "Linpura") => {
  const domain = sendingDomain();
  if (!config.mailgunApiKey || !domain) {
    return Promise.reject(
      new Error(
        "Mailgun is not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN.",
      ),
    );
  }

  const icon = html.includes(`cid:${ICON_CID}`) ? linpuraIcon() : null;

  return client().messages.create(domain, {
    from: fromAddress(domain),
    to,
    subject,
    html,
    ...(icon
      ? {
          inline: {
            filename: ICON_CID,
            data: icon,
            contentType: "image/png",
          },
        }
      : {}),
  });
};
