const PUBLIC_PHOTO_PREFIX = "pictures-blured";

/**
 * Public profile photos are rendered on the server and indexed.
 * The owner segment is an opaque id (the account uid), never an email.
 */
export const publicBlurredKey = (
  ownerId: string,
  imageId: string,
  extension: string
) => {
  const reversedId = [...imageId].reverse().join("");
  return `${PUBLIC_PHOTO_PREFIX}/${ownerId}/${reversedId}${extension}`;
};
