#!/usr/bin/env python3
"""Regenerate the placeholder avatar set in src/assets/images/avatars.

Pulls the DiceBear "toon-head" style and writes female-NN.svg / male-NN.svg,
matching the filenames that src/app/utils/avatar.ts resolves at runtime. If you
change COUNT_PER_GENDER, update AVATARS_PER_GENDER in that file to match.

The style only exposes skin, hair and clothing colors, so the greyscale look is
finished off by rewriting every remaining hex color to its luminance equivalent
(this catches the eyes and lips, which the API hardcodes).

    python3 scripts/generate-avatars.py
"""

import argparse
import os
import re
import urllib.parse
import urllib.request

API = "https://api.dicebear.com/9.x/toon-head/svg"
COUNT_PER_GENDER = 20
DEFAULT_OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src",
    "assets",
    "images",
    "avatars",
)

# (skin, hair) pairs. Hair stays at least ~0x40 darker than the skin beside it so
# it reads on a light card, and never darker than #5c so it stays visible against
# a dark surface -- the style's own outlines are hardcoded black and disappear
# there, so the fills have to carry the silhouette.
TONES = [
    ("e4e4e4", "5c5c5c"),
    ("d4d4d4", "8a8a8a"),
    ("c6c6c6", "666666"),
    ("b8b8b8", "7a7a7a"),
    ("aaaaaa", "5f5f5f"),
    ("dcdcdc", "9c9c9c"),
    ("cfcfcf", "727272"),
    ("bfbfbf", "616161"),
]
# Floor of #5a for the same dark-surface reason.
CLOTHES_COLOR = ["5a5a5a", "707070", "868686", "9c9c9c", "b4b4b4", "cfcfcf"]
EYES = ["happy", "wide", "bow", "humble", "wink"]
BROWS = ["neutral", "raised", "happy", "sad", "neutral"]
MOUTH = ["smile", "laugh", "smile", "agape", "laugh"]

FEMALE = {
    "hair": ["bun", "sideComed"],
    "rearHair": ["longStraight", "longWavy", "shoulderHigh", "neckHigh"],
    "clothes": ["dress", "shirt", "turtleNeck", "dress", "tShirt"],
}
MALE = {
    "hair": ["undercut", "spiky", "sideComed"],
    "beard": ["chin", "fullBeard", "moustacheTwirl", "chinMoustache", "longBeard"],
    "clothes": ["tShirt", "openJacket", "shirt", "turtleNeck", "openJacket"],
}

HEX = re.compile(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")


def to_grey(match):
    hex_color = match.group(1)
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    r, g, b = (int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    if r == g == b:
        return match.group(0)
    luma = round(0.2126 * r + 0.7152 * g + 0.0722 * b)
    return "#%02x%02x%02x" % (luma, luma, luma)


def options(gender, index):
    config = FEMALE if gender == "female" else MALE
    skin, hair_color = TONES[index % len(TONES)]
    params = {
        "seed": f"sugrit-toonhead-{gender}-{index + 1:02d}",
        "backgroundColor": "transparent",
        "skinColor": skin,
        "hairColor": hair_color,
        "clothesColor": CLOTHES_COLOR[index % len(CLOTHES_COLOR)],
        "hair": config["hair"][index % len(config["hair"])],
        "hairProbability": 100,
        "clothes": config["clothes"][index % len(config["clothes"])],
        "eyes": EYES[index % len(EYES)],
        "eyebrows": BROWS[index % len(BROWS)],
        "mouth": MOUTH[index % len(MOUTH)],
    }
    if gender == "female":
        params["rearHair"] = config["rearHair"][index % len(config["rearHair"])]
        params["rearHairProbability"] = 100
        params["beardProbability"] = 0
    else:
        params["rearHairProbability"] = 0
        params["beardProbability"] = 100 if index % 3 == 0 else 0
        if index % 3 == 0:
            params["beard"] = config["beard"][index % len(config["beard"])]
    return params


def fetch(params):
    url = f"{API}?{urllib.parse.urlencode(params, doseq=True)}"
    with urllib.request.urlopen(url, timeout=30) as response:
        return HEX.sub(to_grey, response.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=DEFAULT_OUT, help="output directory")
    parser.add_argument(
        "--count", type=int, default=COUNT_PER_GENDER, help="avatars per gender"
    )
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    for gender in ("female", "male"):
        for index in range(args.count):
            name = f"{gender}-{index + 1:02d}.svg"
            with open(os.path.join(args.out, name), "w", encoding="utf-8") as f:
                f.write(fetch(options(gender, index)))
            print(f"wrote {name}")
    print(f"\n{args.count * 2} avatars written to {args.out}")


if __name__ == "__main__":
    main()
