const request = require('supertest');
const app = require('../app');
const { clearDatabase, createTestUser, createTestArticle, getUserToken } = require('./helpers');
const { User } = require('../models');

describe('管理员 API', () => {
  let admin, user1, user2;
  let adminToken, userToken1, userToken2;

  beforeEach(async () => {
    await clearDatabase();
    
    admin = await createTestUser('admin', 'admin123', 'admin');
    user1 = await createTestUser('user1', 'pass123', 'user');
    user2 = await createTestUser('user2', 'pass456', 'user');
    
    adminToken = getUserToken(admin);
    userToken1 = getUserToken(user1);
    userToken2 = getUserToken(user2);

    await createTestArticle(user1.id, {
      title: 'Article 1',
      content: 'Content 1',
      status: 'published',
    });

    await createTestArticle(user2.id, {
      title: 'Article 2',
      content: 'Content 2',
      status: 'draft',
    });
  });

  describe('GET /admin/users - 获取用户列表', () => {
    it('管理员应该可以获取用户列表', async () => {
      const res = await request(app.callback())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
    });

    it('用户列表应该包含文章数量', async () => {
      const res = await request(app.callback())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const user1Data = res.body.find(u => u.id === user1.id);
      expect(user1Data).toHaveProperty('articleCount');
      expect(user1Data.articleCount).toBe(1);
    });

    it('普通用户不能访问用户列表', async () => {
      const res = await request(app.callback())
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('未登录用户不能访问用户列表', async () => {
      const res = await request(app.callback())
        .get('/admin/users');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('需要身份验证');
    });

    it('无效 token 不能访问用户列表', async () => {
      const res = await request(app.callback())
        .get('/admin/users')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('无效的令牌');
    });
  });

  describe('PATCH /admin/users/:id/role - 修改用户角色', () => {
    it('管理员应该可以提升普通用户为管理员', async () => {
      const res = await request(app.callback())
        .patch(`/admin/users/${user1.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
      expect(res.body.oldRole).toBe('user');
    });

    it('管理员应该可以将管理员降级为普通用户', async () => {
      const newAdmin = await createTestUser('newadmin', 'pass123', 'admin');
      const newAdminToken = getUserToken(newAdmin);

      const res = await request(app.callback())
        .patch(`/admin/users/${user1.id}/role`)
        .set('Authorization', `Bearer ${newAdminToken}`)
        .send({ role: 'user' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('user');
    });

    it('不能降低自己的管理员权限', async () => {
      const res = await request(app.callback())
        .patch(`/admin/users/${admin.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('不能降低自己的管理员权限');
    });

    it('普通用户不能修改其他用户的角色', async () => {
      const res = await request(app.callback())
        .patch(`/admin/users/${user2.id}/role`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('未登录用户不能修改用户角色', async () => {
      const res = await request(app.callback())
        .patch(`/admin/users/${user1.id}/role`)
        .send({ role: 'admin' });

      expect(res.status).toBe(401);
    });

    it('无效的角色值应该返回错误', async () => {
      const res = await request(app.callback())
        .patch(`/admin/users/${user1.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('无效的角色值');
    });

    it('修改不存在用户的角色应该返回 404', async () => {
      const res = await request(app.callback())
        .patch('/admin/users/99999/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('用户不存在');
    });
  });

  describe('GET /admin/stats - 获取统计数据', () => {
    it('管理员应该可以获取统计数据', async () => {
      const res = await request(app.callback())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body).toHaveProperty('totalArticles');
      expect(res.body).toHaveProperty('totalComments');
      expect(res.body).toHaveProperty('totalLikes');
      expect(res.body).toHaveProperty('adminCount');
      expect(res.body).toHaveProperty('regularUserCount');
      expect(res.body).toHaveProperty('publishedCount');
      expect(res.body).toHaveProperty('draftCount');
    });

    it('统计数据应该正确', async () => {
      const res = await request(app.callback())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.totalUsers).toBe(3);
      expect(res.body.adminCount).toBe(1);
      expect(res.body.regularUserCount).toBe(2);
      expect(res.body.totalArticles).toBe(2);
      expect(res.body.publishedCount).toBe(1);
      expect(res.body.draftCount).toBe(1);
    });

    it('普通用户不能访问统计数据', async () => {
      const res = await request(app.callback())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(403);
    });

    it('未登录用户不能访问统计数据', async () => {
      const res = await request(app.callback())
        .get('/admin/stats');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /admin/articles - 管理文章列表', () => {
    it('管理员应该可以查看所有文章', async () => {
      const res = await request(app.callback())
        .get('/admin/articles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body.total).toBe(2);
    });

    it('管理员可以看到草稿文章', async () => {
      const res = await request(app.callback())
        .get('/admin/articles')
        .set('Authorization', `Bearer ${adminToken}`);

      const statuses = res.body.results.map(a => a.status);
      expect(statuses).toContain('draft');
      expect(statuses).toContain('published');
    });

    it('普通用户不能访问管理文章列表', async () => {
      const res = await request(app.callback())
        .get('/admin/articles')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(403);
    });

    it('未登录用户不能访问管理文章列表', async () => {
      const res = await request(app.callback())
        .get('/admin/articles');

      expect(res.status).toBe(401);
    });

    it('可以按状态筛选文章', async () => {
      const res = await request(app.callback())
        .get('/admin/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'draft' });

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.results[0].status).toBe('draft');
    });
  });

  describe('DELETE /admin/articles/:id - 删除文章（管理员）', () => {
    it('管理员应该可以删除任何文章', async () => {
      const article = await createTestArticle(user1.id, {
        title: 'To Delete',
        content: 'Will be deleted',
        status: 'published',
      });

      const res = await request(app.callback())
        .delete(`/admin/articles/${article.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('文章已删除');
    });

    it('普通用户不能通过管理员接口删除文章', async () => {
      const article = await createTestArticle(user2.id, {
        title: 'Protected',
        content: 'Should not be deleted',
        status: 'published',
      });

      const res = await request(app.callback())
        .delete(`/admin/articles/${article.id}`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(403);
    });

    it('未登录用户不能通过管理员接口删除文章', async () => {
      const article = await createTestArticle(user1.id, {
        title: 'Protected 2',
        content: 'Should not be deleted',
        status: 'published',
      });

      const res = await request(app.callback())
        .delete(`/admin/articles/${article.id}`);

      expect(res.status).toBe(401);
    });

    it('删除不存在的文章应该返回 404', async () => {
      const res = await request(app.callback())
        .delete('/admin/articles/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});

describe('权限中间件综合测试', () => {
  let user, admin;
  let userToken, adminToken;

  beforeEach(async () => {
    await clearDatabase();
    user = await createTestUser('user', 'pass123', 'user');
    admin = await createTestUser('admin', 'admin123', 'admin');
    userToken = getUserToken(user);
    adminToken = getUserToken(admin);
  });

  describe('authMiddleware - 需要登录的接口', () => {
    it('无 token 访问需要登录的接口返回 401', async () => {
      const res = await request(app.callback())
        .post('/article')
        .send({ title: 'Test', content: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('需要身份验证');
    });

    it('无效 token 访问需要登录的接口返回 401', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', 'Bearer invalid_token')
        .send({ title: 'Test', content: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('无效的令牌');
    });

    it('有效 token 可以正常访问', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test Article', content: 'Test content' });

      expect(res.status).toBe(200);
    });

    it('token 格式错误（无 Bearer 前缀）应该返回 401', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', userToken)
        .send({ title: 'Test', content: 'Test' });

      expect(res.status).toBe(401);
    });
  });

  describe('adminMiddleware - 需要管理员权限的接口', () => {
    it('普通用户访问管理员接口返回 403', async () => {
      const res = await request(app.callback())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('管理员访问管理员接口正常', async () => {
      const res = await request(app.callback())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('未登录用户访问管理员接口返回 401', async () => {
      const res = await request(app.callback())
        .get('/admin/stats');

      expect(res.status).toBe(401);
    });
  });

  describe('optionalAuthMiddleware - 可选登录的接口', () => {
    it('未登录用户可以访问可选登录的接口', async () => {
      const res = await request(app.callback())
        .get('/article');

      expect(res.status).toBe(200);
    });

    it('已登录用户访问可选登录接口能获取个性化信息', async () => {
      const article = await createTestArticle(user.id, {
        title: 'Test',
        content: 'Test content',
        status: 'published',
      });

      const res = await request(app.callback())
        .get(`/article/${article.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('liked');
    });

    it('无效 token 访问可选登录接口不会报错，按未登录处理', async () => {
      const res = await request(app.callback())
        .get('/article')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(200);
    });
  });
});
