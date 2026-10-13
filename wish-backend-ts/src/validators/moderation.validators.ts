import { body, param, query } from "express-validator";

const signalRule = (field: ReturnType<typeof body>) =>
  field
    .isIn(["device", "fingerprint"])
    .withMessage("signal must be device or fingerprint");

export const listClustersRules = [
  signalRule(query("signal")).optional(),
];

export const dismissClusterRules = [
  signalRule(body("signal")),
  body("key")
    .isString()
    .withMessage("key must be a string")
    .isLength({ min: 1, max: 128 })
    .withMessage("key must be 1 to 128 characters"),
  body("uids")
    .isArray({ min: 2, max: 50 })
    .withMessage("uids must list 2 to 50 accounts"),
  body("uids.*").isString().withMessage("uids must be strings"),
];

export const dismissLinkFlagsRules = [
  param("uid").isString().isLength({ min: 1, max: 128 }),
];

export const removeAccountRules = [
  param("uid").isString().isLength({ min: 1, max: 128 }),
  body("reason")
    .isString()
    .withMessage("reason must be a string")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("reason must be 1 to 200 characters"),
];
