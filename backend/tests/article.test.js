const request = require('supertest');
const app = require('../app');
const { clearDatabase, createTestUser, createTestArticle, createTestTag, getUserToken } = require('./helpers');
const { Article } = require('../models');

describe('文章 API', () => {
  let user1, user2, admin;
  let token1, token2, adminToken;
  let publishedArticle, draftArticle;
  let tag1, tag2;

  beforeEach(async () => {
    await clearDatabase();
    
    user1 = await createTestUser('user1', 'pass123', 'user');
    user2 = await createTestUser('user2', 'pass456', 'user');
    admin = await createTestUser('admin', 'admin123', 'admin');
    
    token1 = getUserToken(user1);
    token2 = getUserToken(user2);
    adminToken = getUserToken(admin);

    tag1 = await createTestTag('JavaScript', '#f7df1e');
    tag2 = await createTestTag('React', '#61dafb');

    publishedArticle = await createTestArticle(user1.id, {
      title: 'Published Article',
      content: 'This is a published article.',
      status: 'published',
      tagIds: [tag1.id, tag2.id],
    });

    draftArticle = await createTestArticle(user1.id, {
      title: 'Draft Article',
      content: 'This is a draft article.',
      status: 'draft',
    });

    await createTestArticle(user2.id, {
      title: 'User2 Article',
      content: 'Article by user2.',
      status: 'published',
    });
  });

  describe('POST /article - 创建文章', () => {
    it('应该成功创建已发布的文章', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'New Article',
          content: 'This is a new article.',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Article');
      expect(res.body.status).toBe('published');
      expect(res.body.authorId).toBe(user1.id);
      expect(res.body).toHaveProperty('id');
    });

    it('应该成功创建草稿文章', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Draft Article',
          content: 'This is a draft.',
          status: 'draft',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('draft');
    });

    it('创建文章时标题不能为空', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: 'Content without title.',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('标题和内容为必填项');
    });

    it('创建文章时内容不能为空', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Title without content.',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('标题和内容为必填项');
    });

    it('未登录用户不能创建文章', async () => {
      const res = await request(app.callback())
        .post('/article')
        .send({
          title: 'Unauthorized Article',
          content: 'Should not be created.',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('需要身份验证');
    });

    it('无效的状态值应该返回错误', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Invalid Status',
          content: 'Test content.',
          status: 'invalid_status',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('无效的状态值');
    });

    it('创建文章时可以添加标签', async () => {
      const res = await request(app.callback())
        .post('/article')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Tagged Article',
          content: 'Article with tags.',
          tagIds: [tag1.id, tag2.id],
        });

      expect(res.status).toBe(200);
      expect(res.body.tags).toHaveLength(2);
      expect(res.body.tags.map(t => t.name)).toEqual(expect.arrayContaining(['JavaScript', 'React']));
    });
  });

  describe('GET /article - 获取文章列表', () => {
    it('应该返回已发布的文章列表', async () => {
      const res = await request(app.callback())
        .get('/article');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pageSize');
      expect(res.body.results.length).toBeGreaterThan(0);
    });

    it('未登录用户不应该看到草稿文章', async () => {
      const res = await request(app.callback())
        .get('/article');

      const titles = res.body.results.map(a => a.title);
      expect(titles).toContain('Published Article');
      expect(titles).not.toContain('Draft Article');
    });

    it('作者可以看到自己的草稿文章', async () => {
      const res = await request(app.callback())
        .get('/article')
        .set('Authorization', `Bearer ${token1}`);

      const titles = res.body.results.map(a => a.title);
      expect(titles).toContain('Published Article');
      expect(titles).toContain('Draft Article');
    });

    it('其他用户不能看到别人的草稿文章', async () => {
      const res = await request(app.callback())
        .get('/article')
        .set('Authorization', `Bearer ${token2}`);

      const titles = res.body.results.map(a => a.title);
      expect(titles).toContain('Published Article');
      expect(titles).not.toContain('Draft Article');
    });

    it('应该支持分页', async () => {
      const res = await request(app.callback())
        .get('/article')
        .query({ page: 1, pageSize: 2 });

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(2);
      expect(res.body.results.length).toBeLessThanOrEqual(2);
    });

    it('应该包含点赞信息', async () => {
      const res = await request(app.callback())
        .get('/article');

      expect(res.body.results[0]).toHaveProperty('likeCount');
      expect(res.body.results[0]).toHaveProperty('liked');
      expect(typeof res.body.results[0].likeCount).toBe('number');
    });

    it('应该包含标签信息', async () => {
      const res = await request(app.callback())
        .get('/article');

      const articleWithTags = res.body.results.find(a => a.title === 'Published Article');
      expect(articleWithTags).toHaveProperty('tags');
      expect(articleWithTags.tags.length).toBeGreaterThan(0);
    });
  });

  describe('GET /article/:id - 获取单篇文章', () => {
    it('应该成功获取已发布文章', async () => {
      const res = await request(app.callback())
        .get(`/article/${publishedArticle.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(publishedArticle.id);
      expect(res.body.title).toBe('Published Article');
    });

    it('作者可以查看自己的草稿文章', async () => {
      const res = await request(app.callback())
        .get(`/article/${draftArticle.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Draft Article');
    });

    it('其他用户不能查看别人的草稿文章', async () => {
      const res = await request(app.callback())
        .get(`/article/${draftArticle.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('文章未找到');
    });

    it('未登录用户不能查看草稿文章', async () => {
      const res = await request(app.callback())
        .get(`/article/${draftArticle.id}`);

      expect(res.status).toBe(404);
    });

    it('获取不存在的文章应该返回 404', async () => {
      const res = await request(app.callback())
        .get('/article/99999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('文章未找到');
    });

    it('获取文章时应该包含作者信息', async () => {
      const res = await request(app.callback())
        .get(`/article/${publishedArticle.id}`);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('user1');
    });
  });

  describe('PUT /article/:id - 更新文章', () => {
    it('作者应该成功更新自己的文章', async () => {
      const res = await request(app.callback())
        .put(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Updated Title',
          content: 'Updated content.',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
    });

    it('管理员应该可以更新任何文章', async () => {
      const res = await request(app.callback())
        .put(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Admin Updated');
    });

    it('其他用户不能更新别人的文章', async () => {
      const res = await request(app.callback())
        .put(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          title: 'Hacked Title',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('未登录用户不能更新文章', async () => {
      const res = await request(app.callback())
        .put(`/article/${publishedArticle.id}`)
        .send({
          title: 'Unauthorized Update',
        });

      expect(res.status).toBe(401);
    });

    it('更新不存在的文章应该返回 404', async () => {
      const res = await request(app.callback())
        .put('/article/99999')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Non-existent',
        });

      expect(res.status).toBe(404);
    });

    it('无效的状态值应该返回错误', async () => {
      const res = await request(app.callback())
        .put(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          status: 'invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('无效的状态值');
    });

    it('可以更新文章的标签', async () => {
      const res = await request(app.callback())
        .put(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          tagIds: [tag1.id],
        });

      expect(res.status).toBe(200);
      expect(res.body.tags).toHaveLength(1);
      expect(res.body.tags[0].name).toBe('JavaScript');
    });

    it('可以清空文章的标签', async () => {
      const res = await request(app.callback())
        .put(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          tagIds: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.tags).toHaveLength(0);
    });
  });

  describe('DELETE /article/:id - 删除文章', () => {
    it('作者应该成功删除自己的文章', async () => {
      const res = await request(app.callback())
        .delete(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('文章已删除');

      const article = await Article.findByPk(publishedArticle.id);
      expect(article).toBeNull();
    });

    it('管理员应该可以删除任何文章', async () => {
      const res = await request(app.callback())
        .delete(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('其他用户不能删除别人的文章', async () => {
      const res = await request(app.callback())
        .delete(`/article/${publishedArticle.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('未登录用户不能删除文章', async () => {
      const res = await request(app.callback())
        .delete(`/article/${publishedArticle.id}`);

      expect(res.status).toBe(401);
    });

    it('删除不存在的文章应该返回 404', async () => {
      const res = await request(app.callback())
        .delete('/article/99999')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('文章未找到');
    });
  });

  describe('PATCH /article/:id/status - 切换文章状态', () => {
    it('作者应该可以切换文章状态', async () => {
      const res = await request(app.callback())
        .patch(`/article/${draftArticle.id}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'published' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('published');
      expect(res.body.oldStatus).toBe('draft');
      expect(res.body.changed).toBe(true);
    });

    it('管理员可以切换任何文章的状态', async () => {
      const res = await request(app.callback())
        .patch(`/article/${draftArticle.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('published');
    });

    it('其他用户不能切换别人文章的状态', async () => {
      const res = await request(app.callback())
        .patch(`/article/${draftArticle.id}/status`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ status: 'published' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('状态未变化时应该返回 changed: false', async () => {
      const res = await request(app.callback())
        .patch(`/article/${publishedArticle.id}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'published' });

      expect(res.status).toBe(200);
      expect(res.body.changed).toBe(false);
      expect(res.body.message).toContain('未发生变化');
    });

    it('无效的状态值应该返回错误', async () => {
      const res = await request(app.callback())
        .patch(`/article/${publishedArticle.id}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('无效的状态值');
    });

    it('未登录用户不能切换文章状态', async () => {
      const res = await request(app.callback())
        .patch(`/article/${publishedArticle.id}/status`)
        .send({ status: 'draft' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /article/mine/list - 获取我的文章列表', () => {
    it('应该返回当前用户的所有文章', async () => {
      const res = await request(app.callback())
        .get('/article/mine/list')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.results.length).toBe(2);
    });

    it('可以按状态筛选', async () => {
      const res = await request(app.callback())
        .get('/article/mine/list')
        .set('Authorization', `Bearer ${token1}`)
        .query({ status: 'draft' });

      expect(res.status).toBe(200);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].status).toBe('draft');
    });

    it('未登录用户不能访问我的文章列表', async () => {
      const res = await request(app.callback())
        .get('/article/mine/list');

      expect(res.status).toBe(401);
    });
  });
});
