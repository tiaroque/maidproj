import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import config from "../endpoints.config";
import { s3Client } from "./file-upload";

const WINDOW_SECONDS = 10 * 60;

export const MEDIA_URL_TTL_SECONDS = 2 * WINDOW_SECONDS;

/**
 * Signing time is rounded down to a fixed window so repeated requests for the
 * same key yield the same URL, which lets the browser cache the image itself.
 * Every URL is still valid for at least one full window after it is handed out.
 */
export const signedMediaUrl = (key: string) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = nowSeconds - (nowSeconds % WINDOW_SECONDS);

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: config.AWSBucketName, Key: key }),
    {
      expiresIn: MEDIA_URL_TTL_SECONDS,
      signingDate: new Date(windowStart * 1000),
    }
  );
};

/** Seconds the browser may reuse a redirect before the signed URL expires. */
export const mediaRedirectMaxAge = () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = nowSeconds - (nowSeconds % WINDOW_SECONDS);
  return Math.max(0, windowStart + MEDIA_URL_TTL_SECONDS - nowSeconds - 60);
};
