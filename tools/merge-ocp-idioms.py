# -*- coding: utf-8 -*-
"""
从 OCP MongoDB idiom collection 拉全量成语，合并到阿里云静态词库。

用法:
  python tools/merge-ocp-idioms.py
  python tools/merge-ocp-idioms.py --env ocp_media --output static/data/games/idioms.json
  python tools/merge-ocp-idioms.py --dry-run   # 只打印统计，不写文件

合并策略:
  - 以 w (成语文本) 为去重 key
  - 现有 idioms.json 中的条目优先保留（拼音不被覆盖）
  - OCP 仅补充现有词库里没有的新成语
  - 跳过非纯汉字 / 长度非 3-8 / 拼音音节数 != 字数 的脏数据
"""
import argparse
import json
import re
import sys
from pathlib import Path

# 复用 tools/mongo_query.py 的连接配置（其内部已处理 stdout UTF-8 编码）
TOOLS_DIR = Path(r'D:\code\tools')
sys.path.insert(0, str(TOOLS_DIR))
from mongo_query import get_db  # noqa: E402

TONE_MAP = str.maketrans({
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v',
})

HANZI_PATTERN = re.compile(r'^[一-龥]+$')


def strip_tone(s: str) -> str:
    return s.lower().translate(TONE_MAP)


def normalize(idiom: str, alphabet: str):
    """返回 (w, p) 或 None（脏数据）。"""
    if not idiom or not alphabet:
        return None
    w = idiom.strip()
    if not HANZI_PATTERN.match(w):
        return None
    if not (3 <= len(w) <= 8):
        return None
    syllables = [s for s in strip_tone(alphabet).split() if s]
    if len(syllables) != len(w):
        return None
    return w, ' '.join(syllables)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--env', default='ocp_media')
    parser.add_argument('--collection', default='idiom')
    parser.add_argument('--output', default=r'D:\code\uniapp-aliyun\static\data\games\idioms.json')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    output_path = Path(args.output)

    print(f'[merge] 读取现有词库 {output_path} ...')
    existing = json.loads(output_path.read_text(encoding='utf-8'))
    if not isinstance(existing, list):
        print('现有词库格式错误，期望 list', file=sys.stderr)
        sys.exit(1)
    existing_keys = {item['w'] for item in existing}
    print(f'[merge] 现有 {len(existing)} 条')

    print(f'[merge] 连接 MongoDB env={args.env} collection={args.collection} ...')
    db = get_db(args.env)
    col = db[args.collection]
    total = col.estimated_document_count()
    print(f'[merge] OCP 集合约 {total} 条')

    added = []
    skip_shape = 0
    skip_pinyin = 0
    skip_dup = 0

    cursor = col.find({}, {'idiom': 1, 'alphabet': 1, '_id': 0}).batch_size(2000)
    for doc in cursor:
        idiom = doc.get('idiom')
        alphabet = doc.get('alphabet')
        result = normalize(idiom, alphabet)
        if result is None:
            if idiom and not HANZI_PATTERN.match(idiom or ''):
                skip_shape += 1
            elif idiom and not (3 <= len(idiom) <= 8):
                skip_shape += 1
            else:
                skip_pinyin += 1
            continue
        w, p = result
        if w in existing_keys:
            skip_dup += 1
            continue
        existing_keys.add(w)
        added.append({'w': w, 'p': p})

    print(f'[merge] OCP 新增 {len(added)} 条；跳过 shape={skip_shape} pinyin={skip_pinyin} dup={skip_dup}')

    if args.dry_run:
        print('[merge] --dry-run，未写文件')
        sample = added[:5]
        print('[merge] 新增样本:', json.dumps(sample, ensure_ascii=False))
        return

    merged = existing + added
    output_path.write_text(json.dumps(merged, ensure_ascii=False), encoding='utf-8')
    print(f'[merge] 写回 {output_path}，总计 {len(merged)} 条')


if __name__ == '__main__':
    main()
