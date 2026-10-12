import { Router } from "express";
import { matchedData } from "express-validator";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { randomUUID } from "crypto";

import config from "../endpoints.config";
import { auth } from "../middleware/auth";
import { validateGenderExists } from "../middleware/validate-gender";
import { validateRequest } from "../middleware/validate-request";
import { isModerator, requireModerator } from "../middleware/require-moderator";
import { deleteObject, s3Client, uploadSelfie } from "../services/file-upload";
import {
  CHALLENGE_TTL_MS,
  isChallengeId,
  pickChallenge,
} from "../services/verification-challenges";
import {
  approve,
  countSubmissionsSince,
  createPending,
  getLatestForUser,
  getPendingById,
  getUserVerificationState,
  listPending,
  reject,
} from "../models/verification";
import {
  rejectRules,
  verificationIdRules,
} from "../validators/verification.validators";

const MAX_SUBMISSIONS_PER_DAY = 3;
const SELFIE_URL_TTL_SECONDS = 10 * 60;

const verificationRouter = Router();

verificationRouter.get("/status", auth, async (req, res, next) => {
  try {
    const [latest, state] = await Promise.all([
      getLatestForUser(req.uid),
      getUserVerificationState(req.uid),
    ]);

    let status = latest?.status ?? "none";
    // An approval no longer counts once the verified photo was replaced.
    if (status === "approved" && !state.verified) {
      status = "none";
    }

    res.status(200).send({
      status,
      verified: state.verified,
      hasProfilePhoto: !!state.profilePhotoKey,
      rejectReason: status === "rejected" ? latest?.rejectReason : undefined,
      isModerator: isModerator(req.email),
    });
  } catch (error) {
    next(error);
  }
});

verificationRouter.post(
  "/challenge",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      const challengeId = pickChallenge();
      req.session!.verifyChallenge = {
        challengeId,
        exp: Date.now() + CHALLENGE_TTL_MS,
      };
      res.status(200).send({ challengeId });
    } catch (error) {
      next(error);
    }
  }
);

verificationRouter.post(
  "/submit",
  auth,
  validateGenderExists,
  uploadSelfie.single("file"),
  async (req, res, next) => {
    try {
      const challenge = req.session?.verifyChallenge;
      if (
        !challenge ||
        !isChallengeId(challenge.challengeId) ||
        typeof challenge.exp !== "number" ||
        challenge.exp <= Date.now()
      ) {
        return res.status(400).send({ error: "CHALLENGE_EXPIRED" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).send({ error: "FILE_REQUIRED" });
      }

      const state = await getUserVerificationState(req.uid);
      if (!state.profilePhotoKey) {
        return res.status(400).send({ error: "PROFILE_PHOTO_REQUIRED" });
      }

      const latest = await getLatestForUser(req.uid);
      if (latest?.status === "pending") {
        return res.status(409).send({ error: "ALREADY_PENDING" });
      }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if ((await countSubmissionsSince(req.uid, since)) >= MAX_SUBMISSIONS_PER_DAY) {
        return res.status(429).send({ error: "TOO_MANY_ATTEMPTS" });
      }

      // rotate() applies the EXIF orientation; re-encoding drops all metadata.
      const selfie = await sharp(file.buffer)
        .rotate()
        .resize({ width: 1080, height: 1080, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Random, unguessable key: the bucket may allow anonymous reads by key.
      const selfieKey = `verification/${req.uid}/${randomUUID()}.jpg`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.AWSVerificationBucketName,
          Key: selfieKey,
          Body: selfie,
          ContentType: "image/jpeg",
        })
      );

      await createPending({
        uid: req.uid,
        email: req.email,
        challengeId: challenge.challengeId,
        selfieKey,
        photoKey: state.profilePhotoKey,
      });

      req.session!.verifyChallenge = null;

      res.status(201).send({ status: "pending" });
    } catch (error) {
      next(error);
    }
  }
);

// // // // // // // // MODERATION // // // // // // // //

verificationRouter.get(
  "/queue",
  auth,
  requireModerator,
  async (req, res, next) => {
    try {
      const pending = await listPending();

      const items = await Promise.all(
        pending.map(async (record) => ({
          id: record._id!.toHexString(),
          uid: record.uid,
          challengeId: record.challengeId,
          photoKey: record.photoKey,
          createdAt: record.createdAt,
          selfieUrl: record.selfieKey
            ? await getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: config.AWSVerificationBucketName,
                  Key: record.selfieKey,
                }),
                { expiresIn: SELFIE_URL_TTL_SECONDS }
              )
            : null,
        }))
      );

      res.status(200).send(items);
    } catch (error) {
      next(error);
    }
  }
);

verificationRouter.post(
  "/:id/approve",
  auth,
  requireModerator,
  ...verificationIdRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = matchedData(req, { locations: ["params"] });
      const record = await getPendingById(id);
      if (!record) {
        return res.status(404).send({ error: "Verification not found" });
      }

      const verified = await approve(record, req.email);
      if (record.selfieKey) {
        await deleteObject(config.AWSVerificationBucketName, [{ Key: record.selfieKey }]);
      }

      res.status(200).send({ verified });
    } catch (error) {
      next(error);
    }
  }
);

verificationRouter.post(
  "/:id/reject",
  auth,
  requireModerator,
  ...rejectRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = matchedData(req, { locations: ["params"] });
      const { reason } = matchedData(req, { locations: ["body"] });
      const record = await getPendingById(id);
      if (!record) {
        return res.status(404).send({ error: "Verification not found" });
      }

      await reject(record, req.email, reason);
      if (record.selfieKey) {
        await deleteObject(config.AWSVerificationBucketName, [{ Key: record.selfieKey }]);
      }

      res.status(200).send({ status: "rejected" });
    } catch (error) {
      next(error);
    }
  }
);

export default verificationRouter;
