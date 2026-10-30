import { Request, Response, NextFunction } from "express";
import config from "../endpoints.config";

export const isModerator = (email?: string) =>
  !!email && config.moderatorEmails.includes(email.trim().toLowerCase());

export const requireModerator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isModerator(req.email)) {
    return res.status(403).send({ error: "Forbidden" });
  }
  return next();
};
