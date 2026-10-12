import FormData from "form-data";
import Mailgun from "mailgun.js";
import config from "../endpoints.config";

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
  return `Clara <postmaster@${domain}>`;
};

export const sendEmail = (to: string, html: string, subject = "Clara") => {
  const domain = sendingDomain();
  if (!config.mailgunApiKey || !domain) {
    return Promise.reject(
      new Error(
        "Mailgun is not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN.",
      ),
    );
  }

  return client().messages.create(domain, {
    from: fromAddress(domain),
    to,
    subject,
    html,
  });
};
