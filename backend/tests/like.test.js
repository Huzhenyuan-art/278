const request = require('supertest');
const app = require('../app');
const { clearDatabase, createTestUser, createTestArticle, getUserToken } = require('./helpers');
const { Like, Notification } = require('../models');

describe('点赞 API', () => {
  let user1, user2, author;
  let token1, token2, authorToken;
  let article;

  beforeEach(async () => {
    await clearDatabase();
    
    author = await createTestUser('author', 'pass123', 'user');
    user1 = await createTestUser('user1', 'pass456', 'user');
    user2 = await createTestUser('user2', 'pass789', 'user');
    
    authorToken = getUserToken(author);
    token1 = getUserToken(user1);
    token2 = getUserToken(user2);

    article = await createTestArticle(author.id, {
      title: 'Test Article',
      content: 'This is a test article for like testing.',
      status: 'published',
    });
  });

  describe('POST /article/:id/like - 切换点赞状态', () => {
    it('应该成功点赞文章', async () => {
      const res = await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likeCount).toBe(1);
    });

    it('应该成功取消点赞', async () => {
      await Like.create({ userId: user1.id, articleId: article.id });

      const res = await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
      expect(res.body.likeCount).toBe(0);
    });

    it('重复点赞应该切换为取消点赞', async () => {
      const like1 = await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      expect(like1.body.liked).toBe(true);
      expect(like1.body.likeCount).toBe(1);

      const like2 = await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      expect(like2.body.liked).toBe(false);
      expect(like2.body.likeCount).toBe(0);
    });

    it('多个用户可以点赞同一篇文章', async () => {
      await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      const res = await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likeCount).toBe(2);
    });

    it('未登录用户不能点赞', async () => {
      const res = await request(app.callback())
        .post(`/article/${article.id}/like`);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('需要身份验证');
    });

    it('点赞不存在的文章应该返回 404', async () => {
      const res = await request(app.callback())
        .post('/article/99999/like')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('文章未找到');
    });

    it('作者自己点赞也应该正常工作', async () => {
      const res = await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likeCount).toBe(1);
    });

    it('点赞后应该在数据库中创建点赞记录', async () => {
      await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      const like = await Like.findOne({
        where: { userId: user1.id, articleId: article.id }
      });

      expect(like).toBeTruthy();
    });

    it('取消点赞后应该从数据库中删除点赞记录', async () => {
      await Like.create({ userId: user1.id, articleId: article.id });

      await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      const like = await Like.findOne({
        where: { userId: user1.id, articleId: article.id }
      });

      expect(like).toBeNull();
    });
  });

  describe('点赞通知', () => {
    it('其他用户点赞作者的文章时应该创建通知', async () => {
      const initialCount = await Notification.count({
        where: { recipientId: author.id, type: 'like' }
      });

      await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      const notification = await Notification.findOne({
        where: { 
          recipientId: author.id, 
          type: 'like',
          triggerUserId: user1.id,
          articleId: article.id,
        }
      });

      expect(notification).toBeTruthy();
      expect(notification.articleTitle).toBe(article.title);
    });

    it('作者自己点赞不应该创建通知', async () => {
      const initialCount = await Notification.count({
        where: { recipientId: author.id }
      });

      await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${authorToken}`);

      const count = await Notification.count({
        where: { recipientId: author.id }
      });

      expect(count).toBe(initialCount);
    });

    it('取消点赞时应该删除对应的通知', async () => {
      await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      const notificationAfterLike = await Notification.findOne({
        where: { 
          recipientId: author.id, 
          triggerUserId: user1.id,
          articleId: article.id,
        }
      });
      expect(notificationAfterLike).toBeTruthy();

      await request(app.callback())
        .post(`/article/${article.id}/like`)
        .set('Authorization', `Bearer ${token1}`);

      const notificationAfterUnlike = await Notification.findOne({
        where: { 
          recipientId: author.id, 
          triggerUserId: user1.id,
          articleId: article.id,
        }
      });
      expect(notificationAfterUnlike).toBeNull();
    });
  });

  describe('GET /article - 文章列表中的点赞信息', () => {
    beforeEach(async () => {
      await Like.create({ userId: user1.id, articleId: article.id });
      await Like.create({ userId: user2.id, articleId: article.id });
    });

    it('文章列表应该包含点赞数', async () => {
      const res = await request(app.callback())
        .get('/article');

      const targetArticle = res.body.results.find(a => a.id === article.id);
      expect(targetArticle).toBeTruthy();
      expect(targetArticle.likeCount).toBe(2);
    });

    it('已登录用户应该看到自己的点赞状态', async () => {
      const res = await request(app.callback())
        .get('/article')
        .set('Authorization', `Bearer ${token1}`);

      const targetArticle = res.body.results.find(a => a.id === article.id);
      expect(targetArticle.liked).toBe(true);
    });

    it('未点赞的用户应该看到 liked: false', async () => {
      const user3 = await createTestUser('user3', 'pass321', 'user');
      const token3 = getUserToken(user3);

      const res = await request(app.callback())
        .get('/article')
        .set('Authorization', `Bearer ${token3}`);

      const targetArticle = res.body.results.find(a => a.id === article.id);
      expect(targetArticle.liked).toBe(false);
    });

    it('未登录用户应该看到 liked: false', async () => {
      const res = await request(app.callback())
        .get('/article');

      const targetArticle = res.body.results.find(a => a.id === article.id);
      expect(targetArticle.liked).toBe(false);
    });
  });

  describe('GET /article/:id - 单篇文章的点赞信息', () => {
    beforeEach(async () => {
      await Like.create({ userId: user1.id, articleId: article.id });
    });

    it('单篇文章应该包含点赞数和点赞状态', async () => {
      const res = await request(app.callback())
        .get(`/article/${article.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.body.likeCount).toBe(1);
      expect(res.body.liked).toBe(true);
    });

    it('未登录用户也能看到点赞数', async () => {
      const res = await request(app.callback())
        .get(`/article/${article.id}`);

      expect(res.body.likeCount).toBe(1);
      expect(res.body.liked).toBe(false);
    });
  });
});
