#!/usr/bin/env node
/**
 * Atualiza posts.json a partir do RSS do WordPress (Blog de Ti / Tiparaleigo).
 * Uso: node scripts/update-posts.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const OUT = path.join(scriptDir, '..', 'posts.json');
const FEED_URL = 'https://tiparaleigo.wordpress.com/feed/';

const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function fmtMeta(pubDate) {
  const date = new Date(pubDate);
  return `Blog de Ti · ${date.getUTCDate()} ${months[date.getUTCMonth()]}. ${date.getUTCFullYear()}`;
}

function trunc(s, n) {
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trim() + '…';
}

function parseFeed(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    const title = (b.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1];
    const link = (b.match(/<link>([^<\s]+)/) || [])[1];
    const pubDate = (b.match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1];
    let desc =
      (b.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || [])[1] || '';
    desc = desc
      .replace(/<a[^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    desc = desc.replace(/([a-záà])([A-ZÁÀ])/g, '$1 $2');
    desc = desc.replace(/K3sé/g, 'K3s é').replace(/Gatewayé/g, 'Gateway é');
    if (!title || !link) continue;
    const text = trunc(`${title.replace(/\s+/g, ' ')} — ${trunc(desc, 260)}`, 440) + ' Continuar Lendo →';
    items.push({
      url: link,
      text,
      meta: fmtMeta(pubDate),
      date: new Date(pubDate).toISOString(),
    });
  }
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  return items;
}

async function main() {
  let xml;
  try {
    const r = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'Sentinela/1.0 (posts sync; +https://tiparaleigo.wordpress.com/)' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    xml = await r.text();
  } catch (e) {
    console.error('Falha ao baixar o feed:', e.message);
    const d = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    d.lastUpdated = new Date().toISOString();
    d.posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    fs.writeFileSync(OUT, JSON.stringify(d, null, 2), 'utf8');
    console.log('Apenas reordenado:', d.lastUpdated);
    process.exit(0);
    return;
  }

  const posts = parseFeed(xml);
  const footer = {
    url: 'https://tiparaleigo.wordpress.com/',
    text: 'Ver todas as postagens no Blog de Ti →',
    meta: 'Tiparaleigo · Aprofundando seus conhecimentos',
    date: '2020-01-01T00:00:00.000Z',
  };

  const out = {
    profileUrl: 'https://tiparaleigo.wordpress.com/',
    lastUpdated: new Date().toISOString(),
    posts: [...posts, footer],
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('Atualizado:', out.lastUpdated, '| posts:', posts.length);
}

main();
