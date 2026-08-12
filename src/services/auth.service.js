const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/user.repository');
const categoryRepository = require('../repositories/category.repository');
const defaultCategories = require('../database/seeds/defaultCategories');
const ApiError = require('../utils/ApiError');

function generateApiKey() {
  return crypto.randomBytes(24).toString('hex');
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user; // eslint-disable-line no-unused-vars
  return safe;
}

const authService = {
  async register({ name, email, password }) {
    const existing = userRepository.findByEmail(email);
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const apiKey = generateApiKey();
    const user = userRepository.create({ name, email, passwordHash, apiKey });

    // Every new user starts with a ready-to-use set of income/expense categories
    for (const cat of defaultCategories) {
      categoryRepository.create({
        userId: user.id,
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
        isDefault: true,
      });
    }

    return { user: sanitizeUser(user), token: generateToken(user) };
  },

  async login({ email, password }) {
    const user = userRepository.findByEmail(email);
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new ApiError(401, 'Invalid email or password');

    return { user: sanitizeUser(user), token: generateToken(user) };
  },

  async regenerateApiKey(userId) {
    const apiKey = generateApiKey();
    const user = userRepository.updateApiKey(userId, apiKey);
    return sanitizeUser(user);
  },

  async getProfile(userId) {
    const user = userRepository.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    return sanitizeUser(user);
  },
};

module.exports = authService;
