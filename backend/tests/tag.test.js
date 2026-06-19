const request = require('supertest');
const app = require('../app');
const { clearDatabase, createTestUser, createTestArticle, createTestTag, getUserToken } = require('./helpers');
const { Tag, ArticleTag } = require('../models');

describe('标签 API', () => {
  let user, admin;
  let userToken, adminToken;
  let tag1, tag2, tag3;

  beforeEach(async () => {
    await clearDatabase();
    
    user = await createTestUser('testuser', 'pass123', 'user');
    admin = await createTestUser('admin', 'admin123', 'admin');
    
    userToken = getUserToken(user);
    adminToken = getUserToken(admin);

    tag1 = await createTestTag('JavaScript', '#f7df1e');
    tag2 = await createTestTag('React', '#61dafb');
    tag3 = await createTestTag('Node.js', '#68a063');
  });

  describe('GET /tag - 获取标签列表', () => {
    it('应该返回所有标签', async () => {
      const res = await request(app.callback())
        .get('/tag');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
    });

    it('标签应该按名称排序', async () => {
      const res = await request(app.callback())
        .get('/tag');

      const names = res.body.map(t => t.name);
      expect(names).toEqual(names.slice().sort());
    });

    it('每个标签应该包含 articleCount', async () => {
      const res = await request(app.callback())
        .get('/tag');

      res.body.forEach(tag => {
        expect(tag).toHaveProperty('articleCount');
        expect(typeof tag.articleCount).toBe('number');
      });
    });

    it('未登录用户也可以获取标签列表', async () => {
      const res = await request(app.callback())
        .get('/tag');

      expect(res.status).toBe(200);
    });

    it('articleCount 应该正确反映文章数量', async () => {
      const article = await createTestArticle(user.id, {
        title: 'Test Article',
        content: 'Test content',
        status: 'published',
        tagIds: [tag1.id, tag2.id],
      });

      const res = await request(app.callback())
        .get('/tag');

      const jsTag = res.body.find(t => t.id === tag1.id);
      const reactTag = res.body.find(t => t.id === tag2.id);
      const nodeTag = res.body.find(t => t.id === tag3.id);

      expect(jsTag.articleCount).toBe(1);
      expect(reactTag.articleCount).toBe(1);
      expect(nodeTag.articleCount).toBe(0);
    });
  });

  describe('GET /tag/:id - 获取单个标签', () => {
    it('应该成功获取单个标签', async () => {
      const res = await request(app.callback())
        .get(`/tag/${tag1.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(tag1.id);
      expect(res.body.name).toBe('JavaScript');
      expect(res.body.color).toBe('#f7df1e');
    });

    it('获取不存在的标签应该返回 404', async () => {
      const res = await request(app.callback())
        .get('/tag/99999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('标签未找到');
    });
  });

  describe('POST /tag - 创建标签', () => {
    it('登录用户应该可以创建标签', async () => {
      const res = await request(app.callback())
        .post('/tag')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Vue.js',
          color: '#42b883',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Vue.js');
      expect(res.body.color).toBe('#42b883');
      expect(res.body).toHaveProperty('id');
    });

    it('创建标签时不指定颜色应该使用默认颜色', async () => {
      const res = await request(app.callback())
        .post('/tag')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Angular',
        });

      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#3b82f6');
    });

    it('标签名称不能为空', async () => {
      const res = await request(app.callback())
        .post('/tag')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('标签名称为必填项');
    });

    it('标签名称不能只有空格', async () => {
      const res = await request(app.callback())
        .post('/tag')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: '   ',
        });

      expect(res.status).toBe(400);
    });

    it('不能创建重复名称的标签', async () => {
      const res = await request(app.callback())
        .post('/tag')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'JavaScript',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('标签已存在');
    });

    it('未登录用户不能创建标签', async () => {
      const res = await request(app.callback())
        .post('/tag')
        .send({
          name: 'New Tag',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('需要身份验证');
    });

    it('创建的标签名称应该被去除首尾空格', async () => {
      const res = await request(app.callback())
        .post('/tag')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: '  TypeScript  ',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('TypeScript');
    });
  });

  describe('PUT /tag/:id - 更新标签', () => {
    it('应该成功更新标签名称', async () => {
      const res = await request(app.callback())
        .put(`/tag/${tag1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'TypeScript',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('TypeScript');
    });

    it('应该成功更新标签颜色', async () => {
      const res = await request(app.callback())
        .put(`/tag/${tag1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          color: '#ff0000',
        });

      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#ff0000');
    });

    it('更新不存在的标签应该返回 404', async () => {
      const res = await request(app.callback())
        .put('/tag/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'New Name',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('标签未找到');
    });

    it('标签名称不能更新为已存在的名称', async () => {
      const res = await request(app.callback())
        .put(`/tag/${tag1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'React',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('标签名称已存在');
    });

    it('标签名称不能为空字符串', async () => {
      const res = await request(app.callback())
        .put(`/tag/${tag1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('标签名称不能为空');
    });

    it('未登录用户不能更新标签', async () => {
      const res = await request(app.callback())
        .put(`/tag/${tag1.id}`)
        .send({
          name: 'Hacked',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /tag/:id - 删除标签', () => {
    it('应该成功删除标签', async () => {
      const res = await request(app.callback())
        .delete(`/tag/${tag1.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('标签已删除');

      const tag = await Tag.findByPk(tag1.id);
      expect(tag).toBeNull();
    });

    it('删除不存在的标签应该返回 404', async () => {
      const res = await request(app.callback())
        .delete('/tag/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('标签未找到');
    });

    it('未登录用户不能删除标签', async () => {
      const res = await request(app.callback())
        .delete(`/tag/${tag1.id}`);

      expect(res.status).toBe(401);
    });

    it('删除标签时应该同时删除关联的 ArticleTag', async () => {
      const article = await createTestArticle(user.id, {
        title: 'Test Article',
        content: 'Test content',
        status: 'published',
        tagIds: [tag1.id],
      });

      const beforeCount = await ArticleTag.count({ where: { tagId: tag1.id } });
      expect(beforeCount).toBe(1);

      await request(app.callback())
        .delete(`/tag/${tag1.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      const afterCount = await ArticleTag.count({ where: { tagId: tag1.id } });
      expect(afterCount).toBe(0);
    });
  });

  describe('GET /article?tagId= - 按标签筛选文章', () => {
    let article1, article2, article3;

    beforeEach(async () => {
      article1 = await createTestArticle(user.id, {
        title: 'JS Article',
        content: 'JavaScript content',
        status: 'published',
        tagIds: [tag1.id],
      });

      article2 = await createTestArticle(user.id, {
        title: 'React Article',
        content: 'React content',
        status: 'published',
        tagIds: [tag2.id],
      });

      article3 = await createTestArticle(user.id, {
        title: 'JS and React',
        content: 'Both JS and React',
        status: 'published',
        tagIds: [tag1.id, tag2.id],
      });
    });

    it('按 tagId 筛选应该只返回包含该标签的文章', async () => {
      const res = await request(app.callback())
        .get('/article')
        .query({ tagId: tag1.id });

      expect(res.status).toBe(200);
      const titles = res.body.results.map(a => a.title);
      expect(titles).toContain('JS Article');
      expect(titles).toContain('JS and React');
      expect(titles).not.toContain('React Article');
    });

    it('按 tagName 筛选应该只返回包含该标签的文章', async () => {
      const res = await request(app.callback())
        .get('/article')
        .query({ tagName: 'React' });

      expect(res.status).toBe(200);
      const titles = res.body.results.map(a => a.title);
      expect(titles).toContain('React Article');
      expect(titles).toContain('JS and React');
      expect(titles).not.toContain('JS Article');
    });

    it('使用不存在的标签筛选应该返回空列表', async () => {
      const res = await request(app.callback())
        .get('/article')
        .query({ tagId: 99999 });

      expect(res.status).toBe(200);
      expect(res.body.results.length).toBe(0);
      expect(res.body.total).toBe(0);
    });

    it('不指定标签筛选应该返回所有文章', async () => {
      const res = await request(app.callback())
        .get('/article');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
    });
  });
});
