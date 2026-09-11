import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { CONTROL_STORAGE_REGISTRY, STORAGE_REGISTRY } from '../utils/common/storageRegistry.js';

const root = resolve(import.meta.dirname, '..');
const registryPath = resolve(root, 'utils/common/storageRegistry.js');
const violations = [];

if (!existsSync(registryPath)) {
  violations.push('缺少 utils/common/storageRegistry.js');
}

const ignored = new Set(['node_modules', 'unpackage', '.git', 'tools']);
const usedBusinessNames = new Set();
const usedControlNames = new Set();
const allowedDynamic = new Map([
  ['utils/common/leitner.js', new Set(['storageKey'])],
  ['utils/common/practiceLog.js', new Set(['storageKey'])],
  ['utils/common/prefsStore.js', new Set(['storageKey'])],
  ['utils/common/safeStorage.js', new Set(['key'])],
  ['pages/learning/dashboard.vue', new Set(['key'])],
  ['pages/learning/paper.vue', new Set(['key'])],
]);

function inspectAccesses(path, source) {
  const aliases = new Map();
  for (const match of source.matchAll(/\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*(STORAGE_KEYS|CONTROL_STORAGE_KEYS)\.(\w+)/g)) {
    aliases.set(match[1], `${match[2]}.${match[3]}`);
  }
  for (const match of source.matchAll(/\b(STORAGE_KEYS|CONTROL_STORAGE_KEYS)\.(\w+)/g)) {
    (match[1] === 'STORAGE_KEYS' ? usedBusinessNames : usedControlNames).add(match[2]);
  }
  const access = /learningStorageApi\.(?:getStorageSync|setStorageSync|removeStorageSync)\s*\(\s*([^,\n)]+)/g;
  for (const match of source.matchAll(access)) {
    const argument = match[1].trim();
    const direct = /^(STORAGE_KEYS|CONTROL_STORAGE_KEYS)\.(\w+)$/.exec(argument);
    if (direct) continue;
    if (aliases.has(argument)) continue;
    if (allowedDynamic.get(path)?.has(argument)) continue;
    violations.push(`${path} 使用未受 registry 约束的动态 key：${argument}`);
  }
  if (/localStorage\.(?:getItem|setItem|removeItem)\s*\(/.test(source)) {
    violations.push(`${path} 绕过 learningStorageApi 访问存储`);
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!['.js', '.vue', '.ts'].includes(extname(full))) continue;
    const source = readFileSync(full, 'utf8');
    const rawKey = /(?:getStorageSync|setStorageSync|removeStorageSync|localStorage\.(?:getItem|setItem|removeItem))\s*\(\s*['"`]/g;
    if (rawKey.test(source)) {
      violations.push(`${relative(root, full)} 仍以字面量访问存储 key`);
    }
    const path = relative(root, full).replaceAll('\\', '/');
    inspectAccesses(path, source);
    if (path !== 'main.js' && /\buni\.(?:getStorageSync|setStorageSync|removeStorageSync)\s*\(/.test(source)) {
      violations.push(`${path} 绕过 learningStorageApi 访问业务存储`);
    }
  }
}

walk(root);

for (const name of Object.keys(STORAGE_REGISTRY)) if (!usedBusinessNames.has(name)) violations.push(`registry 业务 key 未被源码引用：${name}`);
for (const name of Object.keys(CONTROL_STORAGE_REGISTRY)) if (!usedControlNames.has(name)) violations.push(`registry 控制 key 未被源码引用：${name}`);
for (const name of usedBusinessNames) if (!(name in STORAGE_REGISTRY)) violations.push(`源码引用未知业务 registry 成员：${name}`);
for (const name of usedControlNames) if (!(name in CONTROL_STORAGE_REGISTRY)) violations.push(`源码引用未知控制 registry 成员：${name}`);

if (violations.length) {
  for (const item of violations) console.error(`FAIL C06 ${item}`);
  process.exitCode = 1;
} else {
  console.log('PASS C06 学习端存储 key 全部由 registry 提供');
}
