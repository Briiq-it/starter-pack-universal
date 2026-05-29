/**
 * Tests for the starter-pack catalog extractor.
 *
 * Guarantees the generated catalog stays 1-to-1 with the shape the Briiq
 * Engine consumes (catalog v1 via createCatalog). We replicate createCatalog's
 * contract locally so the test stays standalone — a tenant clone can run it
 * without the Engine repo on disk. The live Engine run is the acceptance gate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractCatalog } from './build-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, 'index.html');

function loadCatalog() {
  const html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return extractCatalog(html, path.join('templates', 'index.html'));
}

/**
 * Local mirror of the Engine's createCatalog (app/engine/catalog.mjs).
 * Throws on the exact same conditions. Keeps the schema contract enforced
 * here without importing across repos.
 */
function createCatalog(data) {
  const SUPPORTED_VERSION = 'v1';
  if (!data || data.version !== SUPPORTED_VERSION) {
    throw new Error(`Catalog version mismatch: expected "${SUPPORTED_VERSION}", got "${data && data.version}"`);
  }
  if (!Array.isArray(data.layouts) || data.layouts.length === 0) {
    throw new Error('Catalog layouts list is empty or missing');
  }
  const map = new Map();
  for (const layout of data.layouts) map.set(layout.id, layout);
  const summaries = data.layouts.map(({ id, intent, intent_keywords, arity_hint, slots }) => ({
    id, intent, intent_keywords, arity_hint, slots,
  }));
  return {
    getLayoutById: (id) => map.get(id) ?? null,
    listLayouts: () => summaries,
    cloneLayoutHtml: (id) => (map.get(id) ? (map.get(id).html_clone_template ?? null) : null),
  };
}

test('extracts at least 10 layouts from the template', () => {
  const catalog = loadCatalog();
  assert.equal(catalog.version, 'v1');
  assert.ok(catalog.layouts.length >= 10, `expected >=10 layouts, got ${catalog.layouts.length}`);
});

test('every layout matches the createCatalog v1 contract', () => {
  const catalog = loadCatalog();
  const seen = new Set();
  for (const l of catalog.layouts) {
    assert.equal(typeof l.id, 'string');
    assert.ok(l.id.length > 0, 'layout id must be non-empty');
    assert.ok(!seen.has(l.id), `duplicate layout id: ${l.id}`);
    seen.add(l.id);

    assert.equal(typeof l.intent, 'string');
    assert.ok(Array.isArray(l.intent_keywords), `${l.id}: intent_keywords must be array`);
    assert.equal(typeof l.arity_hint, 'number', `${l.id}: arity_hint must be number`);
    assert.ok(!Number.isNaN(l.arity_hint), `${l.id}: arity_hint must not be NaN`);
    assert.ok(Array.isArray(l.slots), `${l.id}: slots must be array`);
    assert.equal(typeof l.html_clone_template, 'string');
    assert.ok(l.html_clone_template.length > 0, `${l.id}: html_clone_template must be non-empty`);

    for (const s of l.slots) {
      assert.equal(typeof s.id, 'string', `${l.id}: slot id must be string`);
      assert.equal(s.type, 'text', `${l.id}.${s.id}: slot type must be text`);
      assert.equal(typeof s.constraints, 'object', `${l.id}.${s.id}: constraints must be object`);
    }
  }
});

test('every slot has a matching {{slot:X}} placeholder in its clone template', () => {
  const catalog = loadCatalog();
  for (const l of catalog.layouts) {
    for (const s of l.slots) {
      assert.ok(
        l.html_clone_template.includes(`{{slot:${s.id}}}`),
        `${l.id}: missing placeholder {{slot:${s.id}}} in html_clone_template`
      );
    }
  }
});

test('generated catalog is accepted by the Engine createCatalog contract', () => {
  const data = loadCatalog();
  const catalog = createCatalog(data); // throws if schema drifts
  assert.ok(catalog.listLayouts().length >= 10);
  const first = catalog.listLayouts()[0];
  assert.ok(catalog.getLayoutById(first.id), 'getLayoutById must resolve a known id');
  assert.equal(typeof catalog.cloneLayoutHtml(first.id), 'string');
  assert.equal(catalog.getLayoutById('__nope__'), null);
});
