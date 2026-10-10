// _work/build_doc.mjs — 由 少前2_人形六维数据.json 生成 _work/剧情证据与评分依据.md
// 用法：在仓库根目录执行  node _work/build_doc.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = JSON.parse(fs.readFileSync(path.join(root, '少前2_人形六维数据.json'), 'utf8'));
const DIMS = ['火力', '电子战', '搏斗', '素体', '速度', '战术'];
const GRADES = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'ULTRA'];
const letterOf = v => v > 100 ? 'ULTRA' : GRADES[Math.max(0, Math.min(6, Math.floor(v / 12.5)))];
const esc = s => String(s).replace(/\|/g, '\\|');
const E = json.entries || [];
const EDGES = json.edges || [];
const W = json.weights || {};
const sorted = E.slice().sort((a, b) => b.total - a.total || String(a.name).localeCompare(String(b.name), 'zh'));
const byName = new Map(E.map(e => [e.name, e]));

let md = '';
md += '# 六维评分依据（由 少前2_人形六维数据.json 生成）\n\n';
md += '本文件由 \`node _work/build_doc.mjs\` 生成，**勿手改**。自检：\`node _work/verify_scores.mjs\`（25 项）。\n';
md += '> 2026-10-10：内置数据已清空，原 73 人形完整版（含依据档全文）归档在 \`_work/archive/2026-10-10_完整73人形/\`。\n\n---\n\n';

md += '## 一、判据\n\n| 层级 | 内容 |\n|---|---|\n';
md += '| **硬规则** | 字母档＝**数值分带**：E <12.5 ≤ D <25 ≤ C <37.5 ≤ B <50 ≤ A <62.5 ≤ S <75 ≤ **SS ≤100**；**数值 >100 即 ULTRA**（顶点 200）。同一个数值必然同一个档 |\n';
md += '| **硬规则** | **总分＝六维加权**：' + DIMS.map(d => d + ' ' + Math.round((W[d] || 0) * 100) + '%').join('／') + '；每个维度有「参与总分」开关，关掉的整项剔除后按剩余权重归一 |\n';
md += '| **硬规则** | **素体＝型号的纯函数**（同型号同分）；' + (json.frameBaselineNote || '') + ' |\n';
md += '| **口径** | ' + (json.ultraNote || '') + ' |\n';
md += '| **调律** | ' + (json.techNote || '') + ' |\n';
if (json.dimRenameNote) md += '| **沿革** | ' + json.dimRenameNote + ' |\n';
md += '\n### 1.1 各维定义\n\n| 维度 | 定义 | ULTRA 锚 |\n|---|---|---|\n';
DIMS.forEach(d => { const anchor = (json.ultraRule || {})[d]; md += '| ' + d + ' | ' + esc(json.dimDefs[d] || '') + ' | ' + (anchor && byName.has(anchor) ? '**' + anchor + '**（' + byName.get(anchor).s[DIMS.indexOf(d)] + '）' : '—') + ' |\n'; });

md += '\n### 1.2 各维档位分布（ULTRA＝数值 >100）\n\n| 维度 | ULTRA | SS | S | A | B | C | D | E |\n|---|---|---|---|---|---|---|---|---|\n';
DIMS.forEach((d, i) => { const c = {}; GRADES.forEach(g => c[g] = 0); E.forEach(e => c[letterOf(e.s[i])]++); md += '| ' + d + ' | ' + GRADES.slice().reverse().map(g => c[g]).join(' | ') + ' |\n'; });

md += '\n### 1.3 素体型号 → 素体强度（纯函数）\n\n| 型号 | 素体 |\n|---|---|\n';
const bl = Object.entries(json.frameBaseline || {});
if (!bl.length) md += '| （待填） | — |\n';
bl.forEach(([k, v]) => { md += '| \`' + k + '\` | ' + v + ' |\n'; });

md += '\n## 二、总分总表（' + sorted.length + ' 条）\n\n';
if (!sorted.length) md += '_（暂无条目：在页面上新增或导入 JSON 后重跑本脚本）_\n';
else {
  md += '| # | 人形 | 阵营 | **总分** | 梯队 | ' + DIMS.join(' | ') + ' | 型号 |\n|---|' + '---|'.repeat(DIMS.length + 5) + '\n';
  sorted.forEach((e, i) => { md += '| ' + (i + 1) + ' | ' + esc(e.name) + ' | ' + esc(e.faction || '') + ' | **' + e.total + '** | ' + e.tier + ' | ' + e.s.join(' | ') + ' | ' + esc(e.frame || '(无)') + ' |\n'; });
  md += '\n### 2.1 依据摘要\n\n| 人形 | 总分 | 六维 | 依据 |\n|---|---|---|---|\n';
  sorted.forEach(e => { md += '| ' + esc(e.name) + ' | ' + e.total + ' ' + e.tier + ' | ' + e.s.join(' / ') + ' | ' + esc(e.basis || '') + ' |\n'; });
}

md += '\n## 三、关系网（' + EDGES.length + ' 条边）\n\n';
if (!EDGES.length) md += '_（暂无关系边）_\n';
else {
  md += '| # | A | 关系 | B | 维度 | 性质 | 原文 |\n|---|---|---|---|---|---|---|\n';
  EDGES.forEach((e, i) => { const d = e.dim === -1 || e.dim == null ? '总序' : DIMS[e.dim]; md += '| ' + (i + 1) + ' | ' + esc(e.a) + ' | ' + esc(e.rel) + ' | ' + esc(e.b) + ' | ' + d + ' | ' + (e.kind || '实战') + ' | ' + esc(e.note) + ' |\n'; });
}

const FV = json.formVariants || {};
md += '\n## 四、双形态缩略图\n\n';
md += '> ' + (FV.principle || '') + '\n\n';
(FV.rules || []).forEach(r => { md += '- ' + r + '\n'; });
(FV.notes || []).forEach(n => { md += '- ' + n + '\n'; });
const chars = FV.chars || [];
md += '\n';
if (!chars.length) md += '_（暂无形态数据：在 JSON 的 \`formVariants.chars\` 里按同名人形填两态）_\n';
else chars.forEach(ch => {
  md += '### ' + ch.name + '　' + (ch.meta || '') + '\n\n| 形态 | 标记 | ' + DIMS.join(' | ') + ' | 总分 |\n|---|' + '---|'.repeat(DIMS.length + 2) + '\n';
  ch.forms.forEach(f => { md += '| ' + f.label + ' | ' + f.tag + ' | ' + f.values.join(' | ') + ' | ' + f.total + ' ' + f.tier + ' |\n'; });
  md += '\n';
  ch.forms.forEach(f => { md += '**' + f.label + '**（' + f.tag + '）\n\n'; (f.evidence || []).forEach(ev => { md += '- ' + esc(ev.q) + '　—— ' + esc(ev.ref) + '\n'; }); md += '\n'; });
});

md += '\n> 语料：\`_tools/gf2_lang_cn.txt\`（客户端 LangPackageTableCnData 去重可读串）。本机语料不含最新剧情；凡作者裁定，卡片与依据里已标注来源。\n';
fs.writeFileSync(path.join(root, '_work/剧情证据与评分依据.md'), md);
console.log('doc regenerated:', md.length, 'chars');
