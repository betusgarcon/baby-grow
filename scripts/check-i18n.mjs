#!/usr/bin/env node
/**
 * 双语文案检查。`node scripts/check-i18n.mjs`
 *
 * 三件事：
 * 1. 源码里每个 `t('…')` 的键都必须在 messages 里存在（否则运行时显示原始键名）；
 * 2. messages 里有没有已经没人引用的死键（文案改了、调用点删了，键会烂在那里）；
 * 3. 界面上有没有**没被 t() 包裹**的中文（漏翻）。
 *
 * 为什么要有第 3 项：前两项只能保证「用了的键都对」，保证不了「该用的地方都用了」。
 * 漏掉一处不会报错，只会让英文用户看到中文——只有扫描能系统性地发现。
 *
 * 排除：注释、console 输出、mock 数据、以及 i18n 自身。
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'babyGrowFrontend/src')
const MESSAGES = join(SRC, 'i18n/messages.ts')

/** 这些目录/文件的文案是数据或开发期产物，不要求接入 t() */
const IGNORE_PATHS = [
  'i18n/', // 词典自身
  'mock/', // 离线演示数据
  'pages/journey/milestones/milestoneData.ts', // 仓库内的示例数据
  'pages/family/memories/memoriesData.ts',
  'pages/journey/calendar/calendarData.ts', // events 示例数据
  'pages/journey/weekly-insight/weeklyInsightData.ts',
  'components/RecordSheet/recordData.ts',
  'store/profile.ts', // 画像默认值（演示数据）
  'store/vaccine.ts',
  'store/wishes.ts',
  'store/family.ts',
  'store/timeline.ts', // 时间线示例数据
  'store/appStore.ts', // 只有日志
  'api/', // 网络层，只有日志
  'utils/analysisNavigation.ts',
]

const CJK = /[一-鿿]/

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

/** 去掉块注释、行注释与 JSX 注释 */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    // 行尾注释。排除 `https://`（冒号后的 // 不是注释）
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

// ── 1. 读词典 ────────────────────────────────────────────
const messagesSource = readFileSync(MESSAGES, 'utf8')
const definedKeys = new Set()
for (const match of messagesSource.matchAll(/^\s*'([^']+)':\s*\[/gm)) {
  definedKeys.add(match[1])
}

// ── 2. 扫源码 ────────────────────────────────────────────
const usedKeys = new Set()
const missingKeys = []
const unwrapped = []
const isIgnored = (rel) => IGNORE_PATHS.some((prefix) => rel.startsWith(prefix))

for (const file of walk(SRC)) {
  const rel = relative(SRC, file)
  const code = stripComments(readFileSync(file, 'utf8'))

  for (const match of code.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
    usedKeys.add(match[1])
    if (!definedKeys.has(match[1])) {
      missingKeys.push(`${rel}: ${match[1]}`)
    }
  }

  // 有些键不是以 t('…') 直接出现的，而是放在数组里由 formatters 统一翻译
  // （月份名、星期名就是这种）。它们同样算「被引用」，否则会被误报成死键。
  for (const match of code.matchAll(/['"]([a-zA-Z][\w-]*(?:\.[\w-]+)+)['"]/g)) {
    usedKeys.add(match[1])
  }

  if (isIgnored(rel)) continue

  code.split('\n').forEach((line, index) => {
    if (!CJK.test(line) || line.includes('console.')) return
    // 去掉已包裹的 t('…')，剩下的中文就是漏翻的
    const leftover = line.replace(/\bt\(\s*['"][^'"]*['"][^)]*\)/g, '')
    if (CJK.test(leftover)) {
      unwrapped.push(`${rel}:${index + 1}  ${leftover.trim().slice(0, 90)}`)
    }
  })
}

// ── 3. 报告 ─────────────────────────────────────────────
const deadKeys = [...definedKeys].filter((key) => !usedKeys.has(key))

console.log(`词典条目: ${definedKeys.size}   源码引用: ${usedKeys.size}`)

if (missingKeys.length) {
  console.log(`\n❌ 引用了不存在的键 (${missingKeys.length})`)
  missingKeys.forEach((item) => console.log('   ' + item))
}

if (unwrapped.length) {
  console.log(`\n⚠️  未包裹 t() 的中文 (${unwrapped.length})`)
  unwrapped.forEach((item) => console.log('   ' + item))
}

if (deadKeys.length) {
  console.log(`\n⚠️  无人引用的死键 (${deadKeys.length})`)
  deadKeys.forEach((key) => console.log('   ' + key))
}

const failed = missingKeys.length > 0
console.log(failed ? '\n结果：有不存在的键，必须修' : '\n结果：没有引用错误')
process.exit(failed ? 1 : 0)
