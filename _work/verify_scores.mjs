// _work/verify_scores.mjs — 六维数据自检（19 项：结构 / 页面接线；空表也能全绿）
// 用法：在仓库根目录执行  node _work/verify_scores.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSONF = path.join(root, '少前2_人形六维数据.json');
const HTMLF = path.join(root, '少前2_人形六维能力图.html');

const json = JSON.parse(fs.readFileSync(JSONF, 'utf8'));
const html = fs.readFileSync(HTMLF, 'utf8');
const L = html.split('\n');
const DIMS = ['火力', '电子战', '搏斗', '素体', '速度', '战术'];
const GRADES = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'ULTRA'];
const GBANDS = [20, 40, 60, 70, 80, 90, 100];
const letterOf = v => { if (v > 100) return 'ULTRA'; for (let i = 0; i < GBANDS.length; i++) if (v <= GBANDS[i]) return GRADES[i]; return 'SS'; };

const extract = (name) => {
  const head = 'var ' + name + ' = ';
  const i = L.findIndex(s => s.startsWith(head));
  if (i < 0) return null;
  let buf = '';
  for (let k = i; k < Math.min(i + 400, L.length); k++){
    buf += (k === i ? L[i].slice(head.length) : L[k]);
    try { return JSON.parse(buf.trim().replace(/;\s*$/, '')); } catch (e) {}
  }
  return null;
};
const HENT = extract('DEFAULT_DATA');
const HEDG = extract('DEFAULT_EDGES');
const line = L.find(s => s.startsWith('var FORM_DATA = '));
let HFOR = null;
try { HFOR = JSON.parse(line.replace(/^var FORM_DATA = /, '').replace(/;\s*$/, '')); } catch (e) {}

let pass = 0, fail = 0;
const log = [];
const ck = (name, ok, detail) => { if (ok) pass++; else fail++; log.push((ok ? 'PASS ' : 'FAIL ') + name + (ok || !detail ? '' : '\n       ' + detail)); };

const E = json.entries || [], EDGES = json.edges || [];

ck('01 数据文件结构齐备（entries/edges/dimDefs/weights/ultraRule/frameBaseline/formVariants）',
  ['entries', 'edges', 'dimDefs', 'weights', 'ultraRule', 'frameBaseline', 'formVariants'].every(k => json[k] !== undefined) && DIMS.every(d => json.dimDefs[d] && json.weights[d] !== undefined),
  Object.keys(json).join(','));

const diff1 = [];
if (!HENT || HENT.length !== E.length) diff1.push('页内嵌 ' + (HENT ? HENT.length : 'null') + ' / JSON ' + E.length);
else HENT.forEach((h, i) => { const e = E[i];
  for (const k of ['id', 'name', 'faction', 'cls', 'weapon', 'frame', 'side', 'src', 'conf', 'basis', 's', 'total', 'letters', 'tier', 'use', 'verdict', 'vSrc'])
    if (JSON.stringify(h[k]) !== JSON.stringify(e[k])) diff1.push(e.name + '.' + k); });
ck('02 页面内嵌 DEFAULT_DATA 与 JSON entries 完全一致（逐字段）', diff1.length === 0, diff1.slice(0, 6).join('; '));

const key = e => [e.a, e.rel, e.b, e.dim, !!e.group, e.kind || '实战', e.note].join('|');
const jk = EDGES.map(key), hk = (HEDG || []).map(key);
ck('03 页面内嵌 DEFAULT_EDGES 与 JSON edges 完全一致（' + jk.length + ' 条）',
  !!HEDG && jk.length === hk.length && jk.every((k, i) => k === hk[i]),
  '页内嵌 ' + (HEDG ? HEDG.length : 'null') + ' / JSON ' + EDGES.length);

ck('04 页面内嵌 FORM_DATA 与 JSON formVariants 完全一致',
  !!HFOR && JSON.stringify(HFOR) === JSON.stringify(json.formVariants),
  '页面 ' + (HFOR ? JSON.stringify(HFOR).length : 0) + ' / JSON ' + JSON.stringify(json.formVariants || {}).length);

ck('05 条目 id / 名称唯一（' + E.length + ' 条）',
  new Set(E.map(e => e.id)).size === E.length && new Set(E.map(e => e.name)).size === E.length, '');

ck('06 六维取值合法（每条 6 个，0–200）',
  E.every(e => Array.isArray(e.s) && e.s.length === 6 && e.s.every(v => typeof v === 'number' && v >= 0 && v <= 200) && e.total >= 0 && e.total <= 200), '');

ck('07 字母档＝数值分带（同分必同档）',
  E.every(e => e.s.map(letterOf).join() === (e.letters || []).join()),
  E.filter(e => e.s.map(letterOf).join() !== (e.letters || []).join()).map(e => e.name).join('; '));

const W = json.weights || {};
const badT = E.filter(e => { let num = 0, den = 0; const us = e.use || [true, true, true, true, true, true];
  DIMS.forEach((d, i) => { if (us[i] !== false && W[d]) { num += W[d] * e.s[i]; den += W[d]; } });
  const t = den ? Math.round(num / den * 10) / 10 : 0; return Math.abs((e.total || 0) - t) > 0.001; });
ck('08 总分＝六维加权（按「参与总分」开关；权重合计＝1）',
  badT.length === 0 && Math.abs(Object.values(W).reduce((a, b) => a + b, 0) - 1) < 1e-9,
  badT.map(e => e.name + ' ' + e.total).join('; '));

ck('09 梯队＝总分的数值分带', E.every(e => letterOf(e.total) === e.tier), E.filter(e => letterOf(e.total) !== e.tier).map(e => e.name).join('; '));

const ultraPer = DIMS.map((d, i) => E.filter(e => letterOf(e.s[i]) === 'ULTRA').map(e => e.name));
const anchorOk = DIMS.every((d, i) => { const rule = (json.ultraRule || {})[d]; return !rule || (ultraPer[i].length === 1 && ultraPer[i][0] === rule); });
ck('10 每维 ULTRA ≤1；配了锚位时与 ultraRule 一致',
  ultraPer.every(u => u.length <= 1) && anchorOk,
  DIMS.map((d, i) => d + '=' + (ultraPer[i].join(',') || '—')).join(' | '));

const fbad = E.filter(e => e.frame && json.frameBaseline && json.frameBaseline[e.frame] !== undefined && e.s[3] !== json.frameBaseline[e.frame]);
ck('11 素体＝型号的纯函数（同型号必同分；未配置基线的型号不参与）', fbad.length === 0,
  fbad.map(e => e.name + '[' + e.frame + ']=' + e.s[3]).join('; '));

ck('12 关系边均带原文', EDGES.every(e => typeof e.note === 'string' && e.note.length > 2 && e.a && e.b), '');

ck('13 页面没有把数值 / 总分截断在 100 的代码',
  !/Math\.min\(100/.test(html) && !/max="100"/.test(html) && !/\/5\)\*5/.test(html), '');

const pageW = (/var WEIGHTS = \[([^\]]+)\];/.exec(html) || [, ''])[1].split(',').map(x => Number(x.trim()));
ck('14 页面权重数组与 JSON 权重按维度顺序一致',
  pageW.length === 6 && DIMS.every((d, i) => Math.abs(pageW[i] - (W[d] || 0)) < 1e-9),
  'page=' + pageW.join(',') + ' json=' + DIMS.map(d => W[d]).join(','));

ck('15 页面带版本检测与旧档隔离（DATA_VERSION / verbar / staleVer / 新存档键 v5）',
  /var DATA_VERSION = '/.test(html) && /id="verbar"/.test(html) && /staleVer/.test(html) && /gfl2-sixaxis-v5/.test(html) && /LEGACY_KEYS/.test(html), '');

const pageScript = (/<script>([\s\S]*?)<\/script>/.exec(html) || [, ''])[1];
let compileOk = true, compileMsg = '';
try { new Function(pageScript); } catch (e) { compileOk = false; compileMsg = e.message; }
ck('16 页面脚本可编译', compileOk && pageScript.length > 1000, compileMsg);

ck('17 手动保存：保存按钮 ＋ 覆盖确认 ＋ 脏标记 ＋ 离开提醒',
  /id="btnSave"/.test(html) && /function persist\(/.test(html) && /function markDirty\(/.test(html) &&
  html.indexOf('是否覆盖浏览器本地存档') >= 0 && /beforeunload/.test(html) && /q\('btnSave'\)\.addEventListener/.test(html), '');

ck('18 六维图可拖动改数值（拖动把手 ＋ 指针事件 ＋ 沿轴换算）',
  /class="dragv"/.test(html) && /function dragVal\(/.test(html) && /pointerdown/.test(html) &&
  /pointermove/.test(html) && /pointerup/.test(html) && /opt\.drag/.test(html), '');

ck('19 空数据兜底：空表时图鉴给出「＋ 新增人形」入口；有数据时卡片渲染入口在',
  (E.length ? /function cardHTML\(/.test(html) : html.indexOf('还没有人形') >= 0 && /data-act="add"/.test(html)), 'entries=' + E.length);

console.log(log.join('\n'));
console.log('\n==== ' + pass + ' PASS / ' + fail + ' FAIL ====');
process.exit(fail ? 1 : 0);
