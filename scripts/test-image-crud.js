/**
 * Image CRUD smoke test — run: npm run test:image-crud
 * Requires DATABASE_URL (and Supabase Storage creds for cloud upload).
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const productService = require('../src/services/product.service');
const categoryService = require('../src/services/category.service');
const parentCategoryService = require('../src/services/parentCategory.service');
const { ping } = require('../src/config/database');

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`  PASS  ${name}`);
}

function fail(name, err) {
  failed += 1;
  console.log(`  FAIL  ${name}: ${err.message || err}`);
}

/** Minimal 1×1 PNG for upload tests */
function mockImageFile(name = 'test.png') {
  const buffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  return {
    fieldname: 'image',
    originalname: name,
    encoding: '7bit',
    mimetype: 'image/png',
    buffer,
    size: buffer.length,
  };
}

/**
 * Accepts Supabase/public https URLs, PUBLIC_ASSET_BASE_URL + path, or local /uploads paths
 * (verifies the file exists on disk for local fallback).
 */
function assertStoredImageUrl(url, label = 'image') {
  if (!url || typeof url !== 'string') {
    throw new Error(`${label} URL missing`);
  }
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return;
  }
  if (url.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '..', 'src', url);
    if (!fs.existsSync(localPath)) {
      throw new Error(`${label} local file missing: ${localPath}`);
    }
    return;
  }
  throw new Error(`${label} URL has unexpected format: ${url}`);
}

async function testProductImageCrud() {
  let productId = null;
  const sku = `img-crud-${Date.now()}`;
  const file1 = mockImageFile('product-a.png');
  const file2 = mockImageFile('product-b.png');

  try {
    const created = await productService.createProduct(
      {
        website_id: 1,
        name: 'Image CRUD Product',
        price: 12.5,
        stock: 3,
        sku,
        status: 'draft',
      },
      file1
    );
    productId = created.id;
    assertStoredImageUrl(created.image, 'product');
    ok('Product CREATE stores image URL');
  } catch (e) {
    fail('Product CREATE with image', e);
    return;
  }

  let urlAfterCreate;
  try {
    const one = await productService.getProductById(productId);
    assertStoredImageUrl(one.image, 'product');
    urlAfterCreate = one.image;
    ok('Product READ returns image URL');
  } catch (e) {
    fail('Product READ image', e);
  }

  try {
    const updated = await productService.updateProduct(productId, { name: 'Image CRUD Product v2' }, file2);
    assertStoredImageUrl(updated.image, 'product');
    if (!urlAfterCreate || updated.image === urlAfterCreate) {
      throw new Error('image URL should change after new file upload');
    }
    ok('Product UPDATE uploads new image and stores new URL');
  } catch (e) {
    fail('Product UPDATE image', e);
  }

  try {
    const cleared = await productService.updateProduct(productId, { image: '' }, null);
    if (cleared.image !== null) {
      throw new Error(`expected null image, got ${cleared.image}`);
    }
    ok('Product UPDATE clears image when image is empty string');
  } catch (e) {
    fail('Product UPDATE clear image', e);
  }

  const jsonUrl = 'https://example.com/menu-product-image.jpg';
  try {
    const withUrl = await productService.updateProduct(productId, { image: jsonUrl }, null);
    if (withUrl.image !== jsonUrl) {
      throw new Error('JSON image URL not stored');
    }
    const preserved = await productService.updateProduct(productId, { name: 'Preserve Image Product' }, null);
    if (preserved.image !== jsonUrl) {
      throw new Error('image should be preserved when image field is omitted');
    }
    ok('Product UPDATE preserves image URL when field omitted');
  } catch (e) {
    fail('Product UPDATE preserve image', e);
  }

  try {
    await productService.removeProduct(productId);
    productId = null;
    ok('Product DELETE (cleanup)');
  } catch (e) {
    fail('Product DELETE', e);
  }
}

async function testCategoryImageCrud() {
  let categoryId = null;
  const slug = `img-cat-${Date.now()}`;
  const file1 = mockImageFile('category-a.png');
  const file2 = mockImageFile('category-b.png');

  try {
    const created = await categoryService.createCategory(
      {
        parent_id: null,
        name: 'Image CRUD Category',
        slug,
        status: 'active',
      },
      file1
    );
    categoryId = created.id;
    assertStoredImageUrl(created.image, 'category');
    ok('Category CREATE stores image URL');
  } catch (e) {
    fail('Category CREATE with image', e);
    return;
  }

  let urlAfterCreate;
  try {
    const one = await categoryService.getCategoryById(categoryId);
    assertStoredImageUrl(one.image, 'category');
    urlAfterCreate = one.image;
    ok('Category READ returns image URL');
  } catch (e) {
    fail('Category READ image', e);
  }

  try {
    const updated = await categoryService.updateCategory(categoryId, { name: 'Image CRUD Category v2' }, file2);
    assertStoredImageUrl(updated.image, 'category');
    if (!urlAfterCreate || updated.image === urlAfterCreate) {
      throw new Error('image URL should change after new file upload');
    }
    ok('Category UPDATE uploads new image and stores new URL');
  } catch (e) {
    fail('Category UPDATE image', e);
  }

  try {
    const cleared = await categoryService.updateCategory(categoryId, { image: '' }, null);
    if (cleared.image !== null) {
      throw new Error(`expected null image, got ${cleared.image}`);
    }
    ok('Category UPDATE clears image when image is empty string');
  } catch (e) {
    fail('Category UPDATE clear image', e);
  }

  try {
    await categoryService.removeCategory(categoryId);
    categoryId = null;
    ok('Category DELETE (cleanup)');
  } catch (e) {
    fail('Category DELETE', e);
  }
}

async function testParentCategoryImageCrud() {
  let parentId = null;
  const slug = `img-parent-${Date.now()}`;
  const file1 = mockImageFile('parent-a.png');
  const file2 = mockImageFile('parent-b.png');

  try {
    const created = await parentCategoryService.createParentCategory(
      {
        website_id: 1,
        name: 'Image CRUD Parent',
        slug,
        status: 'active',
      },
      file1
    );
    parentId = created.id;
    assertStoredImageUrl(created.image, 'parent category');
    ok('Parent category CREATE stores image URL');
  } catch (e) {
    fail('Parent category CREATE with image', e);
    return;
  }

  let urlAfterCreate;
  try {
    const one = await parentCategoryService.getParentCategoryById(parentId);
    assertStoredImageUrl(one.image, 'parent category');
    urlAfterCreate = one.image;
    ok('Parent category READ returns image URL');
  } catch (e) {
    fail('Parent category READ image', e);
  }

  try {
    const updated = await parentCategoryService.updateParentCategory(
      parentId,
      { name: 'Image CRUD Parent v2' },
      file2
    );
    assertStoredImageUrl(updated.image, 'parent category');
    if (!urlAfterCreate || updated.image === urlAfterCreate) {
      throw new Error('image URL should change after new file upload');
    }
    ok('Parent category UPDATE uploads new image and stores new URL');
  } catch (e) {
    fail('Parent category UPDATE image', e);
  }

  try {
    const cleared = await parentCategoryService.updateParentCategory(parentId, { image: '' }, null);
    if (cleared.image !== null) {
      throw new Error(`expected null image, got ${cleared.image}`);
    }
    ok('Parent category UPDATE clears image when image is empty string');
  } catch (e) {
    fail('Parent category UPDATE clear image', e);
  }

  try {
    await parentCategoryService.removeParentCategory(parentId);
    parentId = null;
    ok('Parent category DELETE (cleanup)');
  } catch (e) {
    fail('Parent category DELETE', e);
  }
}

async function run() {
  console.log('\n=== Image CRUD test ===\n');

  try {
    await ping();
    ok('Database ping');
  } catch (e) {
    fail('Database ping', e);
    process.exit(1);
  }

  await testProductImageCrud();
  await testCategoryImageCrud();
  await testParentCategoryImageCrud();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
