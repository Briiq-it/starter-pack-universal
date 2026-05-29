#!/usr/bin/env node
/**
 * Briiq template catalog extractor (universal starter).
 *
 * Scans templates/index.html for <section> elements annotated with
 * data-briiq-layout-id and extracts a catalog.json with layout metadata,
 * slot definitions, and html_clone_template (HTML with {{slot:X}} placeholders).
 *
 * Output shape is catalog v1 — 1-to-1 with the Briiq Engine's createCatalog
 * (app/engine/catalog.mjs). The Engine clones html_clone_template and fills
 * the {{slot:X}} placeholders; the brand-checker validates the result.
 *
 * Run: npm run build:catalog   (node templates/build-catalog.mjs)
 * Output: templates/catalog.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, 'index.html');
const OUTPUT_PATH = path.join(__dirname, 'catalog.json');

export function extractCatalog(html, sourcePath) {
  const root = parse(html);
  const sections = root.querySelectorAll('section[data-briiq-layout-id]');
  const seenIds = new Set();
  const layouts = [];

  for (const section of sections) {
    const id = section.getAttribute('data-briiq-layout-id');
    if (seenIds.has(id)) {
      throw new Error(`duplicate layout-id: ${id}`);
    }
    seenIds.add(id);

    const intent = section.getAttribute('data-briiq-intent') ?? '';
    const keywords = (section.getAttribute('data-briiq-keywords') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const arity = parseInt(section.getAttribute('data-briiq-arity') ?? '0', 10);

    const slotEls = section.querySelectorAll('[data-briiq-slot]');
    const slots = slotEls.map(el => {
      const slotId = el.getAttribute('data-briiq-slot');
      const maxChars = parseInt(el.getAttribute('data-briiq-slot-max') ?? '0', 10) || undefined;
      return {
        id: slotId,
        type: 'text',
        constraints: maxChars ? { maxChars } : {},
      };
    });

    // Build html_clone_template: replace text content of slot elements with {{slot:X}}
    const sectionClone = parse(section.outerHTML);
    const slotElsClone = sectionClone.querySelectorAll('[data-briiq-slot]');
    for (const el of slotElsClone) {
      const slotId = el.getAttribute('data-briiq-slot');
      el.set_content(`{{slot:${slotId}}}`);
    }
    const html_clone_template = sectionClone.toString();

    layouts.push({
      id,
      intent,
      intent_keywords: keywords,
      arity_hint: arity,
      slots,
      html_clone_template,
    });
  }

  return {
    version: 'v1',
    generatedAt: new Date().toISOString(),
    source: sourcePath,
    layouts,
  };
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('build-catalog.mjs')) {
  const html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const source = path.join('templates', 'index.html');
  const catalog = extractCatalog(html, source);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2));
  console.log(`[build-catalog] Wrote ${OUTPUT_PATH}`);
  console.log(`[build-catalog] Extracted ${catalog.layouts.length} layouts:`);
  for (const l of catalog.layouts) {
    console.log(`  - ${l.id} (arity=${l.arity_hint}, ${l.slots.length} slots)`);
  }
}
