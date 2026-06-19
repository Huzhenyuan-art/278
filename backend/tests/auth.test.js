const request = require('supertest');
const app = require('../app');
const { clearDatabase, createTestUser } = require('./helpers');
const { User } = require('../models');

describe('用户认证 API', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /auth/register - 用户注册', () => {
    it('应该成功注册新用户并返回 token 和用户信息', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'test123',
          email: 'test@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('role');
      expect(typeof res.body.token).toBeTruthy();
    });

    it('第一个注册的用户应该是管理员', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'adminuser',
          password: 'admin123',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
    });

    it('第二个注册的用户应该是普通用户', async () => {
      await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'firstuser',
          password: 'pass123',
        });

      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'seconduser',
          password: 'pass456',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('user');
    });

    it('注册时用户名不能为空', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: '',
          password: 'test123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
      expect(res.body.error).toContain('用户名和密码不能为空');
    });

    it('注册时密码不能为空', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('用户名长度不能小于 3 个字符', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'ab',
          password: 'test123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('用户名长度必须在 3 到 20 个字符之间');
    });

    it('用户名长度不能大于 20 个字符', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'a'.repeat(21),
          password: 'test123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('用户名长度必须在 3 到 20 个字符之间');
    });

    it('密码长度不能小于 6 个字符', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: '12345',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('密码长度必须在 6 到 20 个字符之间');
    });

    it('密码长度不能大于 20 个字符', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'a'.repeat(21),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('密码长度必须在 6 到 20 个字符之间');
    });

    it('不能重复注册相同用户名', async () => {
      await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'test123',
        });

      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'test456',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('该用户名已被占用');
    });

    it('注册时可以不提供邮箱', async () => {
      const res = await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'test123',
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('id');
    });

    it('注册后密码应该被加密存储', async () => {
      await request(app.callback())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'test123',
        });

      const user = await User.findOne({ where: { username: 'testuser' } });
      expect(user).toBeTruthy();
      expect(user.password).not.toBe('test123');
      expect(user.password.length).toBeGreaterThan(10);
    });
  });

  describe('POST /auth/login - 用户登录', () => {
    beforeEach(async () => {
      await createTestUser('testuser', 'test123', 'user');
    });

    it('应该成功登录并返回 token 和用户信息', async () => {
      const res = await request(app.callback())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'test123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.token).toBeTruthy();
    });

    it('用户名不存在时应该返回 401 错误', async () => {
      const res = await request(app.callback())
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'test123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('用户名或密码错误');
    });

    it('密码错误时应该返回 401 错误', async () => {
      const res = await request(app.callback())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpass',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('用户名或密码错误');
    });

    it('登录成功返回的 token 应该包含正确的用户信息', async () => {
      const res = await request(app.callback())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'test123',
        });

      const { verifyToken } = require('../utils/jwt');
      const decoded = verifyToken(res.body.token);
      expect(decoded).toBeTruthy();
      expect(decoded.username).toBe('testuser');
      expect(decoded.role).toBe('user');
      expect(decoded.id).toBe(res.body.user.id);
    });

    it('空用户名应该返回错误', async () => {
      const res = await request(app.callback())
        .post('/auth/login')
        .send({
          username: '',
          password: 'test123',
        });

      expect(res.status).toBe(401);
    });

    it('空密码应该返回错误', async () => {
      const res = await request(app.callback())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: '',
        });

      expect(res.status).toBe(401);
    });
  });
});
