const request = require('supertest');
const bcrypt = require('bcryptjs');
const { User, Article, Tag, Like, sequelize } = require('../../models');
const { signToken } = require('../../utils/jwt');

const createTestUser = async (username, password, role = 'user') => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    password: hashedPassword,
    email: `${username}@example.com`,
    role,
  });
  return user;
};

const createTestAdmin = async (username = 'admin', password = 'admin123') => {
  return createTestUser(username, password, 'admin');
};

const getUserToken = (user) => {
  return signToken({ id: user.id, username: user.username, role: user.role });
};

const createTestArticle = async (authorId, options = {}) => {
  const article = await Article.create({
    title: options.title || 'Test Article',
    content: options.content || 'This is a test article content.',
    status: options.status || 'published',
    authorId,
    coverImage: options.coverImage || null,
  });

  if (options.tagIds && options.tagIds.length > 0) {
    const tags = await Tag.findAll({ where: { id: options.tagIds } });
    await article.addTags(tags);
  }

  return article;
};

const createTestTag = async (name, color = '#3b82f6') => {
  return Tag.create({ name, color });
};

const clearDatabase = async () => {
  const modelNames = [
    'notification',
    'comment',
    'like',
    'articleTag',
    'article',
    'tag',
    'user',
  ];
  
  for (const name of modelNames) {
    const Model = sequelize.models[name];
    if (Model) {
      await Model.destroy({ where: {}, truncate: false });
    }
  }
};

const authRequest = (app, token) => {
  return request(app).set('Authorization', `Bearer ${token}`);
};

module.exports = {
  createTestUser,
  createTestAdmin,
  getUserToken,
  createTestArticle,
  createTestTag,
  clearDatabase,
  authRequest,
};
