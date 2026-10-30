import { body, query } from "express-validator";

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const previewMailRules = [
  query("audience").isIn(["one", "all"]).withMessage("audience must be one or all"),
  query("email")
    .if(query("audience").equals("one"))
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("email must be valid"),
];

export const sendMailRules = [
  body("audience").isIn(["one", "all"]).withMessage("audience must be one or all"),
  body("email")
    .if(body("audience").equals("one"))
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("email must be valid"),
  body("subject")
    .isString()
    .trim()
    .isLength({ min: 1, max: 140 })
    .withMessage("subject must be 1 to 140 characters"),
  body("message")
    .isString()
    .trim()
    .isLength({ min: 1, max: 8000 })
    .withMessage("message must be 1 to 8000 characters"),
  body("cta")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage("button label must be 1 to 60 characters"),
  body("url")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .custom((value) => isHttpUrl(value))
    .withMessage("button link must start with http:// or https://"),
  body("cta").custom((cta, { req }) => {
    const label = String(cta ?? "").trim();
    const url = String(req.body?.url ?? "").trim();
    if (Boolean(label) !== Boolean(url)) {
      throw new Error("A button needs both a label and a link");
    }
    if (url && !isHttpUrl(url)) {
      throw new Error("button link must start with http:// or https://");
    }
    return true;
  }),
];
