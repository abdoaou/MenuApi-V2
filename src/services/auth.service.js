const bcrypt = require('bcrypt');
const adminModel = require('../models/admin.model');
const roleModel = require('../models/role.model');
const refreshTokenModel = require('../models/refreshToken.model');
const { signToken } = require('../utils/jwt');
const { generateRefreshToken, hashRefreshToken } = require('../utils/apiKey');
const logger = require('../utils/logger');

function tokenPayload(admin, role) {
  return {
    id: admin.id,
    username: admin.username,
    roleName: role?.name || 'super_admin',
    websiteId: admin.website_id ?? null,
  };
}

function refreshExpiryDate() {
  const days = 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function login({ email, username, password }) {
  const identifier = email || username;
  if (!identifier || !password) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const admin = await adminModel.findByEmailOrUsername(identifier);
  if (!admin || admin.is_active === false) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    logger.warn('Failed login attempt', { username: admin.username });
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const role = await roleModel.findRoleByAdminId(admin.id);
  const payload = tokenPayload(admin, role);
  const accessToken = signToken(payload);
  const refreshToken = generateRefreshToken();

  await refreshTokenModel.insert({
    adminId: admin.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshExpiryDate(),
  });

  return {
    accessToken,
    refreshToken,
    admin: {
      id: admin.id,
      username: admin.username,
      role: payload.roleName,
      websiteId: payload.websiteId,
    },
  };
}

async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const stored = await refreshTokenModel.findValid(hashRefreshToken(rawRefreshToken));
  if (!stored) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const admin = await adminModel.findById(stored.admin_id);
  if (!admin) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const role = await roleModel.findRoleByAdminId(admin.id);
  const payload = tokenPayload(admin, role);
  const accessToken = signToken(payload);

  return {
    accessToken,
    admin: {
      id: admin.id,
      username: admin.username,
      role: payload.roleName,
      websiteId: payload.websiteId,
    },
  };
}

async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    await refreshTokenModel.revoke(hashRefreshToken(rawRefreshToken));
  }
}

module.exports = { login, refresh, logout };
