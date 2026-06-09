const bcrypt = require('bcrypt');
const adminModel = require('../models/admin.model');
const websiteModel = require('../models/website.model');

const BCRYPT_ROUNDS = 10;

function normalizeWebsiteId(value) {
  if (value === undefined || value === null || value === '') return null;
  return Number(value);
}

async function assertWebsite(id) {
  if (id === null || id === undefined) return;
  const site = await websiteModel.findById(id);
  if (!site) {
    const err = new Error('Website not found');
    err.statusCode = 404;
    throw err;
  }
}

async function assertUniqueCredentials({ username, email, excludeId }) {
  if (await adminModel.countByUsername(username, excludeId)) {
    const err = new Error('Username already in use');
    err.statusCode = 409;
    throw err;
  }
  if (await adminModel.countByEmail(email, excludeId)) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }
}

async function listAdmins() {
  return adminModel.listAll();
}

async function getAdminById(id) {
  const admin = await adminModel.findById(id);
  if (!admin) {
    const err = new Error('Admin not found');
    err.statusCode = 404;
    throw err;
  }
  return admin;
}

async function createAdmin(body) {
  const username = body.username.trim();
  const email = body.email.trim().toLowerCase();
  const websiteId = normalizeWebsiteId(body.website_id);
  await assertWebsite(websiteId);
  await assertUniqueCredentials({ username, email, excludeId: null });

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
  const id = await adminModel.insertAdmin({
    username,
    email,
    password: passwordHash,
    website_id: websiteId,
  });
  return getAdminById(id);
}

async function updateAdmin(id, body) {
  const existing = await adminModel.findByIdWithPassword(id);
  if (!existing) {
    const err = new Error('Admin not found');
    err.statusCode = 404;
    throw err;
  }

  const username = body.username !== undefined ? body.username.trim() : existing.username;
  const email =
    body.email !== undefined ? body.email.trim().toLowerCase() : existing.email;
  const websiteId =
    body.website_id !== undefined
      ? normalizeWebsiteId(body.website_id)
      : existing.website_id ?? null;

  await assertWebsite(websiteId);
  await assertUniqueCredentials({ username, email, excludeId: id });

  let passwordHash = existing.password;
  if (body.password) {
    passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
  }

  const affected = await adminModel.updateAdmin(id, {
    username,
    email,
    password: passwordHash,
    website_id: websiteId,
  });
  if (!affected) {
    const err = new Error('Admin not found');
    err.statusCode = 404;
    throw err;
  }
  return getAdminById(id);
}

async function removeAdmin(id, currentAdminId) {
  if (Number(id) === Number(currentAdminId)) {
    const err = new Error('You cannot delete your own admin account');
    err.statusCode = 400;
    throw err;
  }

  const total = await adminModel.countAll();
  if (total <= 1) {
    const err = new Error('Cannot delete the last admin account');
    err.statusCode = 400;
    throw err;
  }

  const affected = await adminModel.deleteAdmin(id);
  if (!affected) {
    const err = new Error('Admin not found');
    err.statusCode = 404;
    throw err;
  }
}

module.exports = {
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  removeAdmin,
};
