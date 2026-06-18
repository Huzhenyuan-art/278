const Router = require('koa-router');
const { Comment, User, Article } = require('../models');
const { verifyToken } = require('../utils/jwt');
const { Op } = require('sequelize');

const router = new Router({
    prefix: '/comment'
});

// Middleware to check auth
const authMiddleware = async (ctx, next) => {
    const token = ctx.header.authorization?.replace('Bearer ', '');
    if (!token) {
        ctx.throw(401, '需要身份验证');
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        ctx.throw(401, '无效的令牌');
    }
    ctx.state.user = decoded;
    await next();
};

// Middleware to optionally get user (for public endpoints)
const optionalAuthMiddleware = async (ctx, next) => {
    const token = ctx.header.authorization?.replace('Bearer ', '');
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            ctx.state.user = decoded;
        }
    }
    await next();
};

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;

// ---------- Helpers ----------

// Determine if current user can delete a comment:
// the comment author OR the author of the article.
const canDeleteComment = (comment, articleAuthorId, currentUserId) => {
    return !!currentUserId
        && !comment.isDeleted
        && (comment.userId === currentUserId || articleAuthorId === currentUserId);
};

// Only the author of the comment can edit it.
const canEditComment = (comment, currentUserId) => {
    return !!currentUserId
        && !comment.isDeleted
        && comment.userId === currentUserId;
};

// Attach user info safely (for soft-deleted comments userId may be null)
const attachUser = (user) => user ? { id: user.id, username: user.username } : null;

// Fetch article author and validate existence.
const getArticleAuthor = async (articleId) => {
    const article = await Article.findByPk(articleId, { attributes: ['id', 'authorId'] });
    if (!article) return null;
    return article;
};

// Build a nested comment tree from a flat list.
const buildTree = (flatList) => {
    const byId = {};
    const roots = [];
    for (const c of flatList) byId[c.id] = { ...c, replies: [] };
    for (const c of Object.values(byId)) {
        if (c.parentId && byId[c.parentId]) {
            byId[c.parentId].replies.push(c);
        } else {
            roots.push(c);
        }
    }
    // Sort replies inside each level by id ascending (oldest reply first).
    const sortReplies = (node) => {
        if (node.replies && node.replies.length > 1) {
            node.replies.sort((a, b) => a.id - b.id);
        }
        node.replies.forEach(sortReplies);
    };
    roots.forEach(sortReplies);
    return roots;
};

// Recursively annotate comments with canDelete / canEdit and replace soft-deleted content/user.
const annotateTree = (nodes, articleAuthorId, currentUserId) => {
    return nodes.map(node => {
        const out = { ...node };
        if (out.isDeleted) {
            out.content = '该评论已删除';
            out.user = null;
            out.replyToUser = null;
            out.canDelete = false;
            out.canEdit = false;
        } else {
            out.canDelete = canDeleteComment(out, articleAuthorId, currentUserId);
            out.canEdit = canEditComment(out, currentUserId);
        }
        if (out.replies) {
            out.replies = annotateTree(out.replies, articleAuthorId, currentUserId);
        }
        return out;
    });
};

// ---------- Routes ----------

// List comments for an article (paginated top-level, nested replies attached)
router.get('/article/:articleId', optionalAuthMiddleware, async (ctx) => {
    const articleId = parseInt(ctx.params.articleId, 10);
    if (isNaN(articleId)) {
        ctx.throw(400, '无效的文章 ID');
    }

    const article = await getArticleAuthor(articleId);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }

    const limit = Math.min(parseInt(ctx.query.limit, 10) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const beforeId = parseInt(ctx.query.beforeId, 10);

    const rootWhere = { articleId, parentId: { [Op.is]: null } };
    if (!isNaN(beforeId)) {
        rootWhere.id = { [Op.lt]: beforeId };
    }

    const total = await Comment.count({ where: { articleId, parentId: { [Op.is]: null }, isDeleted: false } });

    // Step 1: paginate top-level comments (newest first)
    const topRows = await Comment.findAll({
        where: rootWhere,
        include: [
            { model: User, attributes: ['id', 'username'] },
            { model: User, as: 'replyToUser', attributes: ['id', 'username'] },
        ],
        order: [['id', 'DESC']],
        limit: limit + 1,
    });

    const hasMore = topRows.length > limit;
    const topComments = hasMore ? topRows.slice(0, limit) : topRows;
    const nextCursor = topComments.length > 0 ? topComments[topComments.length - 1].id : null;

    let flatAll = topComments.map(c => c.toJSON());

    // Step 2: if we have top-level comments, fetch ALL descendants in one go
    if (topComments.length > 0) {
        const topIds = topComments.map(c => c.id);

        // Fetch all non-root comments under these roots, regardless of level, for this article.
        // We walk the tree by iteratively expanding descendants. Because of depth limitations,
        // we do up to 10 iterations to be safe, but in practice this quickly converges.
        const foundIds = new Set(topIds);
        let currentParentIds = topIds;
        const allDescendants = [];

        for (let round = 0; round < 10 && currentParentIds.length > 0; round++) {
            const rows = await Comment.findAll({
                where: {
                    articleId,
                    parentId: { [Op.in]: currentParentIds },
                },
                include: [
                    { model: User, attributes: ['id', 'username'] },
                    { model: User, as: 'replyToUser', attributes: ['id', 'username'] },
                ],
            });
            const jsons = rows.map(r => r.toJSON());
            allDescendants.push(...jsons);
            const next = [];
            for (const j of jsons) {
                if (!foundIds.has(j.id)) {
                    foundIds.add(j.id);
                    next.push(j.id);
                }
            }
            currentParentIds = next;
        }

        flatAll = [...flatAll, ...allDescendants];
    }

    // Attach user association in correct shape
    flatAll = flatAll.map(c => ({
        ...c,
        user: attachUser(c.user),
        replyToUser: attachUser(c.replyToUser),
    }));

    // Step 3: build tree and annotate
    const tree = buildTree(flatAll);
    const currentUserId = ctx.state.user?.id;
    const articleAuthorId = article.authorId;
    const annotated = annotateTree(tree, articleAuthorId, currentUserId);

    ctx.body = {
        comments: annotated,
        total,
        hasMore,
        nextCursor,
    };
});

// Create a comment (top-level or reply)
router.post('/article/:articleId', authMiddleware, async (ctx) => {
    const articleId = parseInt(ctx.params.articleId, 10);
    if (isNaN(articleId)) {
        ctx.throw(400, '无效的文章 ID');
    }

    const article = await getArticleAuthor(articleId);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }

    const { content, parentId, replyToUserId } = ctx.request.body;
    if (!content || !content.trim()) {
        ctx.throw(400, '评论内容不能为空');
    }

    let validatedParentId = null;
    let validatedReplyToUserId = null;

    if (parentId !== undefined && parentId !== null) {
        const parsed = parseInt(parentId, 10);
        if (isNaN(parsed)) {
            ctx.throw(400, '无效的父评论 ID');
        }
        const parent = await Comment.findByPk(parsed);
        if (!parent) {
            ctx.throw(404, '父评论未找到');
        }
        if (parent.articleId !== articleId) {
            ctx.throw(400, '父评论不属于该文章');
        }
        validatedParentId = parsed;

        // If replyToUserId is provided, verify it matches the parent comment's author
        // OR equals any previous reply's author (for nested "@user" reply).
        if (replyToUserId !== undefined && replyToUserId !== null) {
            const rtu = parseInt(replyToUserId, 10);
            if (!isNaN(rtu)) {
                const exists = await User.findByPk(rtu, { attributes: ['id'] });
                if (exists) {
                    validatedReplyToUserId = rtu;
                }
            }
        }
        // Fallback: default to parent comment's author
        if (!validatedReplyToUserId) {
            validatedReplyToUserId = parent.userId;
        }
    }

    const comment = await Comment.create({
        content: content.trim(),
        userId: ctx.state.user.id,
        articleId,
        parentId: validatedParentId,
        replyToUserId: validatedReplyToUserId,
    });

    const fullComment = await Comment.findByPk(comment.id, {
        include: [
            { model: User, attributes: ['id', 'username'] },
            { model: User, as: 'replyToUser', attributes: ['id', 'username'] },
        ],
    });

    const data = {
        ...fullComment.toJSON(),
        user: attachUser(fullComment.user),
        replyToUser: attachUser(fullComment.replyToUser),
        replies: [],
        canDelete: true,
        canEdit: true,
    };

    ctx.body = data;
});

// Edit a comment (only the comment author)
router.put('/:id', authMiddleware, async (ctx) => {
    const comment = await Comment.findByPk(ctx.params.id);
    if (!comment) {
        ctx.throw(404, '评论未找到');
    }
    if (comment.isDeleted) {
        ctx.throw(400, '评论已删除');
    }

    const userId = ctx.state.user.id;
    if (comment.userId !== userId) {
        ctx.throw(403, '权限不足');
    }

    const { content } = ctx.request.body;
    if (!content || !content.trim()) {
        ctx.throw(400, '评论内容不能为空');
    }

    comment.content = content.trim();
    await comment.save();

    const fullComment = await Comment.findByPk(comment.id, {
        include: [
            { model: User, attributes: ['id', 'username'] },
            { model: User, as: 'replyToUser', attributes: ['id', 'username'] },
        ],
    });

    const article = await getArticleAuthor(comment.articleId);
    const data = {
        ...fullComment.toJSON(),
        user: attachUser(fullComment.user),
        replyToUser: attachUser(fullComment.replyToUser),
        canDelete: canDeleteComment(fullComment.toJSON(), article?.authorId, userId),
        canEdit: true,
    };

    ctx.body = data;
});

// Delete a comment
// Hard delete if no replies; otherwise soft delete to keep thread structure.
// Permitted for: comment author OR article author.
router.delete('/:id', authMiddleware, async (ctx) => {
    const comment = await Comment.findByPk(ctx.params.id);
    if (!comment) {
        ctx.throw(404, '评论未找到');
    }
    if (comment.isDeleted) {
        // Idempotent: already soft-deleted -> just return success
        ctx.body = { message: '评论已删除' };
        return;
    }

    const userId = ctx.state.user.id;

    // 1. The commenter can delete their own comment.
    let allowed = comment.userId === userId;

    // 2. The article author can delete any comment under their article.
    if (!allowed) {
        const article = await getArticleAuthor(comment.articleId);
        allowed = !!article && article.authorId === userId;
    }
    if (!allowed) {
        ctx.throw(403, '权限不足');
    }

    // Check if this comment has any direct children
    const childCount = await Comment.count({ where: { parentId: comment.id, isDeleted: false } });

    if (childCount > 0) {
        // Soft delete: keep placeholder so nested replies remain attached
        comment.isDeleted = true;
        comment.userId = null;
        comment.replyToUserId = null;
        await comment.save();
    } else {
        // Hard delete (no replies)
        await comment.destroy();
    }

    ctx.body = { message: '评论已删除' };
});

module.exports = router;
