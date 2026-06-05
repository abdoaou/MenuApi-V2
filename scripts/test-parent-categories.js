/**
 * Parent categories CRUD smoke test — run: node scripts/test-parent-categories.js
 */
require('dotenv').config();

const parentCategoryService = require('../src/services/parentCategory.service');
const { ping } = require('../src/config/database');

const tests = [];
let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  tests.push({ name, status: 'PASS' });
  console.log(`  PASS  ${name}`);
}

function fail(name, err) {
  failed += 1;
  tests.push({ name, status: 'FAIL', error: err.message || String(err) });
  console.log(`  FAIL  ${name}: ${err.message || err}`);
}

async function run() {
  console.log('\n=== Parent categories CRUD test ===\n');

  try {
    await ping();
    ok('Database ping');
  } catch (e) {
    fail('Database ping', e);
    process.exit(1);
  }

  let createdId = null;
  const slug = `test-parent-${Date.now()}`;

  try {
    const list = await parentCategoryService.listParentCategories();
    if (!Array.isArray(list)) throw new Error('list is not an array');
    ok(`GET list (${list.length} parents)`);
  } catch (e) {
    fail('GET list', e);
  }

  try {
    const created = await parentCategoryService.createParentCategory(
      {
        website_id: 1,
        name: 'Automated Test Parent',
        slug,
        description: 'delete me',
        status: 'active',
      },
      null
    );
    if (created.parent_id !== undefined) throw new Error('parent_categorie row should not have parent_id');
    if (!created.id) throw new Error('missing id');
    createdId = created.id;
    ok(`POST create (id=${createdId})`);
  } catch (e) {
    fail('POST create', e);
  }

  if (createdId) {
    try {
      const one = await parentCategoryService.getParentCategoryById(createdId);
      if (one.name !== 'Automated Test Parent') throw new Error('wrong name');
      if (!Array.isArray(one.children)) throw new Error('children missing');
      ok('GET by id (+ children array)');
    } catch (e) {
      fail('GET by id', e);
    }

    try {
      const updated = await parentCategoryService.updateParentCategory(
        createdId,
        { name: 'Automated Test Parent Updated' },
        null
      );
      if (updated.name !== 'Automated Test Parent Updated') throw new Error('update name mismatch');
      ok('PUT update');
    } catch (e) {
      fail('PUT update', e);
    }

    try {
      await parentCategoryService.removeParentCategory(createdId);
      let stillThere = false;
      try {
        await parentCategoryService.getParentCategoryById(createdId);
        stillThere = true;
      } catch (e) {
        if (e.statusCode !== 404) throw e;
      }
      if (stillThere) throw new Error('still exists after delete');
      ok('DELETE hard-delete');
    } catch (e) {
      fail('DELETE', e);
    }
  }

  try {
    const listAfter = await parentCategoryService.listParentCategories();
    const ghost = listAfter.find((r) => r.slug === slug);
    if (ghost) throw new Error('deleted parent still in list');
    ok('Deleted parent not in list');
  } catch (e) {
    fail('List after delete', e);
  }

  // Block delete when subcategories exist (requires parent_id FK → categories.id)
  try {
    const categoryModel = require('../src/models/category.model');
    const parent = await parentCategoryService.createParentCategory(
      {
        website_id: 1,
        name: 'Parent With Child',
        slug: `parent-child-${Date.now()}`,
        status: 'active',
      },
      null
    );
    let childId;
    try {
      childId = await categoryModel.insertCategory({
        parent_id: parent.id,
        name: 'Child Cat',
        slug: `child-${Date.now()}`,
        image: null,
        description: null,
        status: 'active',
      });
    } catch (e) {
      if (e.code === '23503' && String(e.detail || '').includes('parent_categories')) {
        console.log(
          '  SKIP  DELETE guard (children): run database/parent_categories.postgres.sql FK fix in Supabase'
        );
        await parentCategoryService.removeParentCategory(parent.id);
        console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
        process.exit(failed > 0 ? 1 : 0);
      }
      throw e;
    }
    let blocked = false;
    try {
      await parentCategoryService.removeParentCategory(parent.id);
    } catch (e) {
      if (e.statusCode === 409) blocked = true;
      else throw e;
    }
    if (!blocked) throw new Error('expected 409 when children exist');
    ok('DELETE blocked when subcategories exist');
    await categoryModel.deleteById(childId);
    await parentCategoryService.removeParentCategory(parent.id);
    ok('Cleanup parent+child test rows');
  } catch (e) {
    fail('DELETE guard (children)', e);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
