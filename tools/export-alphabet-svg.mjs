#!/usr/bin/env node
/**
 * Export Alphabet letters A–Z to SVG matching index.html 2D "Line" (outline) look:
 * - Each grid cell = one front-view brick, default size 4 (width BW = 4*U), same as bk() / compLetter.
 * - White body (rounded BR), black seam edges (drawBodyEdges rules), stud ellipse strokes (getStudCenters).
 * - Stud occlusion: getCoveredStudXs when stacked layers.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'alphabet-svg');

const U = 28;
const BW = U * 4;
const BH = U * 1.2;
const SW = U * 0.56;
const SH = U * 0.35;
const BR = U * 0.06;
const BSTK = BH + SH;
const COVERED_STUD_Y_TOL = Math.max(10, BSTK * 0.22);

const ALPHABET = {
  A: [[0, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1]],
  B: [[1, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 0]],
  C: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 1]],
  D: [[1, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 0]],
  E: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [1, 1, 1, 1]],
  F: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [1, 0, 0, 0]],
  G: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 0, 1, 1], [1, 0, 0, 1], [1, 1, 1, 1]],
  H: [[1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1]],
  I: [[1, 1, 1, 1], [0, 1, 1, 0], [0, 1, 1, 0], [0, 1, 1, 0], [1, 1, 1, 1]],
  J: [[0, 1, 1, 1], [0, 0, 0, 1], [0, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 0]],
  K: [[1, 0, 0, 1], [1, 0, 1, 0], [1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1]],
  L: [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 1]],
  M: [[1, 0, 0, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1]],
  N: [[1, 0, 0, 1], [1, 1, 0, 1], [1, 1, 0, 1], [1, 0, 1, 1], [1, 0, 0, 1]],
  O: [[1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1]],
  P: [[1, 1, 1, 1], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 0], [1, 0, 0, 0]],
  Q: [[1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 1, 1], [1, 1, 1, 1]],
  R: [[1, 1, 1, 1], [1, 0, 0, 1], [1, 1, 1, 0], [1, 0, 1, 0], [1, 0, 0, 1]],
  S: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 1], [1, 1, 1, 1]],
  T: [[1, 1, 1, 1], [0, 1, 1, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 1, 1, 0]],
  U: [[1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1]],
  V: [[1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1], [0, 1, 1, 0]],
  W: [[1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1], [1, 1, 1, 1]],
  X: [[1, 0, 0, 1], [0, 1, 1, 0], [0, 1, 1, 0], [0, 1, 1, 0], [1, 0, 0, 1]],
  Y: [[1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1], [0, 1, 1, 0], [0, 1, 1, 0]],
  Z: [[1, 1, 1, 1], [0, 0, 1, 0], [0, 1, 0, 0], [1, 0, 0, 0], [1, 1, 1, 1]],
};

const COLS = 4;
const ROWS = 5;
const pad = 12;
const EDGE = '#141414';
const STROKE = 1.1;

function n(v) {
  return Number(v.toFixed(2));
}

function brickW(size) {
  return (size || 4) * U;
}

function bk(x, y, size, depth) {
  return { x: Math.round(x), y: Math.round(y), tx: Math.round(x), ty: Math.round(y), view: 'front', rotated: false, size: size || 4, depth: depth || 1, layer: 0 };
}

function buildBricksForLetter(letter) {
  const grid = ALPHABET[letter];
  const cx0 = 0;
  const cy0 = 0;
  const totalW = COLS * BW;
  const totalH = ROWS * BSTK;
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!grid[r][c]) continue;
      const bx = cx0 - totalW / 2 + c * BW + BW / 2;
      const by = cy0 - totalH / 2 + r * BSTK + BSTK / 2;
      out.push(bk(bx, by));
    }
  }
  const brickYs = [...new Set(out.map((b) => Math.round(b.ty)))].sort((a, b) => b - a);
  out.forEach((b) => {
    b.layer = brickYs.indexOf(Math.round(b.ty));
  });
  return out;
}

function getStudCenters(bx, by, size) {
  const w = brickW(size);
  const bh = BH;
  const sw = SW;
  const sh = SH;
  const n = size || 4;
  const studY = by - bh / 2 - sh / 2;
  const studs = [];
  for (let i = 0; i < n; i++) studs.push(bx - w / 2 + U * (i + 0.5));
  return studs.map((sx) => ({ sx, sy: studY, hw: sw / 2, hh: sh / 2 }));
}

function getCoveredStudXs(b, bx, by, allBricks) {
  const myStuds = getStudCenters(bx, by, b.size);
  if (!myStuds.length) return new Set();
  const covered = new Set();
  for (const upper of allBricks) {
    if (upper === b) continue;
    if (upper.view === 'top') continue;
    if ((upper.layer || 0) <= (b.layer || 0)) continue;
    const ux = upper.tx;
    const uy = upper.ty;
    if (Math.abs(uy + BSTK - by) > COVERED_STUD_Y_TOL) continue;
    const upperStuds = getStudCenters(ux, uy, upper.size);
    const holeXs = upperStuds.map((st) => st.sx);
    for (const st of myStuds) {
      if (holeXs.some((hx) => Math.abs(st.sx - hx) < U * 0.35)) {
        covered.add(Math.round(st.sx));
      }
    }
  }
  return covered;
}

function getSharedRightSeam(b, bx, by, list) {
  const yTol = Math.max(1.2, BSTK * 0.03);
  const xTol = 0.9;
  const hw = b.rotated ? BH / 2 : brickW(b.size) / 2;
  for (const ob of list) {
    if (ob === b || ob.view === 'top') continue;
    if ((ob.layer || 0) !== (b.layer || 0)) continue;
    if (Math.abs(ob.ty - by) > yTol) continue;
    const ohw = ob.rotated ? BH / 2 : brickW(ob.size) / 2;
    if (Math.abs(bx + hw - (ob.tx - ohw)) <= xTol) return true;
  }
  return false;
}

function getSharedBottomSeam(b, bx, by, list) {
  const hh = BH / 2;
  const yTol = 0.9;
  const xTol = Math.max(1.2, U * 0.08);
  const hw = b.rotated ? BH / 2 : brickW(b.size) / 2;
  for (const ob of list) {
    if (ob === b || ob.view === 'top') continue;
    if ((ob.layer || 0) !== (b.layer || 0)) continue;
    const ohh = BH / 2;
    const ohw = ob.rotated ? BH / 2 : brickW(ob.size) / 2;
    if (Math.abs(by + hh - (ob.ty - ohh)) > yTol) continue;
    if (Math.abs(bx - ob.tx) < hw + ohw - xTol) return true;
  }
  return false;
}

function brickSvgFragments(b, bricks) {
  const bx = b.tx;
  const by = b.ty;
  const w = brickW(b.size);
  const hw = w / 2;
  const hh = BH / 2;
  const xL = n(bx - hw);
  const xR = n(bx + hw);
  const yT = n(by - hh);
  const yB = n(by + hh);
  const parts = [];

  parts.push(
    `<rect x="${xL}" y="${yT}" width="${n(w)}" height="${n(BH)}" rx="${n(BR)}" ry="${n(BR)}" fill="none" stroke="none"/>`
  );

  const sharedR = getSharedRightSeam(b, bx, by, bricks);
  const sharedB = getSharedBottomSeam(b, bx, by, bricks);
  const se = STROKE / 2;
  parts.push(`<g fill="none" stroke="${EDGE}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">`);
  parts.push(`<line x1="${xL}" y1="${n(yT + se)}" x2="${xR}" y2="${n(yT + se)}"/>`);
  parts.push(`<line x1="${n(xL + se)}" y1="${yT}" x2="${n(xL + se)}" y2="${yB}"/>`);
  if (!sharedR) parts.push(`<line x1="${xR}" y1="${yT}" x2="${xR}" y2="${yB}"/>`);
  if (!sharedB) parts.push(`<line x1="${xL}" y1="${yB}" x2="${xR}" y2="${yB}"/>`);
  parts.push(`</g>`);

  const covered = getCoveredStudXs(b, bx, by, bricks);
  const studs = getStudCenters(bx, by, b.size).filter((st) => !covered.has(Math.round(st.sx)));
  parts.push(`<g fill="none" stroke="${EDGE}" stroke-width="${STROKE}" stroke-linecap="round">`);
  for (const st of studs) {
    parts.push(
      `<ellipse cx="${n(st.sx)}" cy="${n(st.sy)}" rx="${n(Math.max(1, st.hw))}" ry="${n(Math.max(1, st.hh))}"/>`
    );
  }
  parts.push(`</g>`);

  return parts.join('\n');
}

function letterSvg(letter) {
  const bricks = buildBricksForLetter(letter);
  const gw = COLS * BW;
  const gh = ROWS * BSTK;
  const W = n(gw + pad * 2);
  const H = n(gh + pad * 2);
  const ox = pad + gw / 2;
  const oy = pad + gh / 2;

  const parts = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Brick letter ${letter}">`
  );
  parts.push(`<title>Alphabet ${letter} (outline, size-4 bricks)</title>`);
  parts.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
  parts.push(`<g transform="translate(${n(ox)},${n(oy)})">`);
  for (const b of bricks) {
    parts.push(brickSvgFragments(b, bricks));
  }
  parts.push(`</g></svg>`);
  return parts.join('\n');
}

fs.mkdirSync(outDir, { recursive: true });
for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  fs.writeFileSync(path.join(outDir, `${letter}.svg`), letterSvg(letter), 'utf8');
}
console.log('Wrote 26 SVG (outline, 1×4 bricks per cell) to', outDir);
