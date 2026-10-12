import { publicRootProjection } from "../user";
const accentClasses: Record<string, string> = {
  a: "[aàáâãäå]",
  e: "[eèéêë]",
  i: "[iìíîï]",
  o: "[oòóôõö]",
  u: "[uùúûü]",
  c: "[cç]",
  n: "[nñ]",
  y: "[yýÿ]",
};

const toAccentInsensitivePattern = (word: string) =>
  word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[aeioucny]/gi, (char) => accentClasses[char.toLowerCase()]);

export const partialTextPatterns = (search: string) =>
  search
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
    .map(toAccentInsensitivePattern);

// Substring match per word, case- and accent-insensitive. `$text` only
// matches whole stemmed words, so typing "vil" would never find "villa".
export const partialTextMatch = (
  field: string,
  search: string,
  mode: "all" | "any"
) => {
  const patterns = partialTextPatterns(search);
  if (patterns.length === 0) {
    return {};
  }

  const conditions = patterns.map((pattern) => ({
    [field]: { $regex: pattern, $options: "i" },
  }));

  return mode === "all" ? { $and: conditions } : { $or: conditions };
};

export const filterBlockedUsers = (userMeId: string) => {
  return [
    {
      $lookup: {
        from: "users",
        pipeline: [
          { $match: { $expr: { $eq: ["$uid", userMeId] } } },
          { $project: { _id: 0, blocked: 1 } },
        ],
        as: "blockedByMeListOfList",
      },
    },
    {
      $addFields: {
        blockedByMeList: { $first: "$blockedByMeListOfList.blocked" },
      },
    },
    {
      $match: {
        $expr: {
          $and: [
            {
              $not: [
                { $in: ["$uid", { $ifNull: ["$blockedByMeList", []] }] },
              ],
            },
            { $not: [{ $in: [userMeId, { $ifNull: ["$blocked", []] }] }] },
          ],
        },
      },
    },
  ];
};

export const lookupFromUser = (userMeId: string) => [
  {
    $lookup: {
      from: "users",
      let: {
        uid: "$participants",
      },
      pipeline: [
        { $match: { $expr: { $eq: ["$uid", "$$uid"] } } },
        ...filterBlockedUsers(userMeId),
        { $project: { _id: 0, ...publicRootProjection } },
        {
          $set: {
            images: {
              $let: {
                vars: {
                  profileImages: {
                    $filter: {
                      input: { $ifNull: ["$images", []] },
                      as: "image",
                      cond: { $eq: ["$$image.isProfile", true] },
                    },
                  },
                },
                in: {
                  $cond: [
                    { $gt: [{ $size: "$$profileImages" }, 0] },
                    "$$profileImages",
                    {
                      $cond: [
                        { $ifNull: ["$avatar", false] },
                        [],
                        { $slice: [{ $ifNull: ["$images", []] }, 1] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      ],
      as: "userTo",
    },
  },
  {
    $set: {
      userTo: {
        $first: "$userTo",
      },
    },
  },
];
