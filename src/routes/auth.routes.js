const express = require('express');

const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               email: { type: string }
 *               username: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: JWT access and refresh tokens
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', ...authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 */
router.post('/refresh', ...authController.refresh);
router.post('/logout', ...authController.logout);

module.exports = router;
