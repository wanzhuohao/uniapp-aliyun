#!/usr/bin/env python3
"""Generate Jolly Phonics 42 音 mp3 via Microsoft edge-tts.

读 static/data/english/phonics.json，按 ipa 映射到启蒙化的拟音文本
(如 /ʃ/ → "shhh... shhh... shhh")，用 edge-tts 批量生成 mp3 到
static/audio/phonics/。支持 --update-json 同步回写 audioFile 字段。

Usage:
    python generate-edge-tts.py              # 默认全量生成 + 更新 json
    python generate-edge-tts.py --only sh    # 只生成 sh.mp3，便于试听
    python generate-edge-tts.py --force      # 已存在也重新生成
    python generate-edge-tts.py --voice en-US-EmmaNeural --rate -10%

Voices 推荐（儿童/女声/清晰）:
    en-US-AvaNeural    — 美式年轻女声（默认，清晰温柔）
    en-US-EmmaNeural   — 美式成熟女声
    en-GB-LibbyNeural  — 英式女声
    en-US-JennyNeural  — 美式女声（标准）
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

# IPA → 启蒙化拟音文本（送给 TTS 让它发出接近音素的声音）
# 念三遍方便孩子辨识。辅音用 "x-x-x" 顿挫，元音用 "xxx" 延长。
IPA_TO_TEXT = {
    # 第 1 组
    "/s/":  "sss... sss... sss",
    "/æ/":  "aah... aah... aah",
    "/t/":  "t-t-t... t-t-t... t-t-t",
    "/ɪ/":  "ih... ih... ih",
    "/p/":  "p-p-p... p-p-p... p-p-p",
    "/n/":  "nnn... nnn... nnn",
    # 第 2 组
    "/k/":  "k-k-k... k-k-k... k-k-k",
    "/e/":  "eh... eh... eh",
    "/h/":  "h-h-h... h-h-h... h-h-h",
    "/r/":  "rrr... rrr... rrr",
    "/m/":  "mmm... mmm... mmm",
    "/d/":  "d-d-d... d-d-d... d-d-d",
    # 第 3 组
    "/g/":  "g-g-g... g-g-g... g-g-g",
    "/ɒ/":  "oh... oh... oh",
    "/ʌ/":  "uh... uh... uh",
    "/l/":  "lll... lll... lll",
    "/f/":  "fff... fff... fff",
    "/b/":  "b-b-b... b-b-b... b-b-b",
    # 第 4 组
    "/eɪ/": "ay... ay... ay",
    "/dʒ/": "juh... juh... juh",
    "/əʊ/": "ohh... ohh... ohh",
    "/aɪ/": "eye... eye... eye",
    "/iː/": "eee... eee... eee",
    "/ɔː/": "or... or... or",
    # 第 5 组
    "/z/":  "zzz... zzz... zzz",
    "/w/":  "wuh... wuh... wuh",
    "/ŋ/":  "ngng... ngng... ngng",
    "/v/":  "vvv... vvv... vvv",
    "/ʊ/":  "oo... oo... oo",          # 短 oo
    "/uː/": "oooo... oooo... oooo",     # 长 oo
    # 第 6 组
    "/j/":  "yuh... yuh... yuh",       # y 的发音
    "/ks/": "kss... kss... kss",
    "/tʃ/": "ch... ch... ch",
    "/ʃ/":  "shhh... shhh... shhh",
    "/ð/":  "th (this)... th (this)",   # 浊 th
    "/θ/":  "th (thin)... th (thin)",   # 清 th
    # 第 7 组
    "/kw/": "kwuh... kwuh... kwuh",
    "/aʊ/": "ow... ow... ow",
    "/ɔɪ/": "oy... oy... oy",
    "/juː/": "you... you... you",
    "/ɜː/": "err... err... err",
    "/ɑː/": "aaar... aaar... aaar",
}

# letters 字段 → 输出 slug（文件名不含 .mp3）
# 规则：中文/空格/符号做友好转写，其它保留 letters 原样小写
LETTERS_TO_SLUG = {
    "c, k":      "k",
    "oo (短)":    "oo_short",
    "oo (长)":    "oo_long",
    "th (浊)":    "th_voiced",
    "th (清)":    "th_voiceless",
}


def slug_for(letters: str) -> str:
    return LETTERS_TO_SLUG.get(letters, letters.strip().lower())


async def synth_one(text: str, voice: str, rate: str, out: Path) -> None:
    comm = edge_tts.Communicate(text, voice=voice, rate=rate)
    await comm.save(str(out))


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="static/data/english/phonics.json")
    parser.add_argument("--out-dir", default="static/audio/phonics")
    parser.add_argument("--voice", default="en-US-AvaNeural")
    parser.add_argument("--rate", default="-20%")
    parser.add_argument("--only", default=None, help="只生成该 slug")
    parser.add_argument("--force", action="store_true", help="已存在也覆盖")
    parser.add_argument("--no-update-json", action="store_true",
                        help="不回写 phonics.json 的 audioFile 字段")
    args = parser.parse_args()

    data_path = Path(args.data)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    groups = json.loads(data_path.read_text(encoding="utf-8"))

    total = 0
    made = 0
    skipped = 0
    missing_ipa = []

    for g in groups:
        for s in g["sounds"]:
            total += 1
            slug = slug_for(s["letters"])
            text = IPA_TO_TEXT.get(s["ipa"])
            if text is None:
                missing_ipa.append((s["letters"], s["ipa"]))
                continue

            if args.only and slug != args.only:
                continue

            out_file = out_dir / f"{slug}.mp3"
            if out_file.exists() and not args.force:
                skipped += 1
                s["audioFile"] = f"{slug}.mp3"
                continue

            print(f"[{made+1:02d}] {s['letters']:<10} {s['ipa']:<8} → {slug}.mp3  «{text[:28]}»")
            await synth_one(text, args.voice, args.rate, out_file)
            s["audioFile"] = f"{slug}.mp3"
            made += 1

    if missing_ipa:
        print("\n[WARN] 缺少 IPA 映射:")
        for letters, ipa in missing_ipa:
            print(f"  - {letters} ({ipa})")

    if not args.no_update_json and not args.only:
        data_path.write_text(
            json.dumps(groups, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"\n[OK] 已更新 {data_path} 的 audioFile 字段")

    print(f"\nTotal: {total}   Generated: {made}   Skipped (already exists): {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
