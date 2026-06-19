const Router = require('koa-router');
const multer = require('koa-multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/default');
const { authMiddleware } = require('../utils/rbac');

const router = new Router({
    prefix: '/upload'
});

const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const getDateDir = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const createStorage = (subDir) => multer.diskStorage({
    destination: (req, file, cb) => {
        const dateDir = getDateDir();
        const uploadDir = path.join(__dirname, '..', config.upload.baseDir, subDir, dateDir);
        ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型，仅支持 JPG、PNG、GIF、WEBP 格式'), false);
    }
};

const coverUpload = multer({
    storage: createStorage('cover'),
    limits: { fileSize: config.upload.maxSize },
    fileFilter
});

const contentUpload = multer({
    storage: createStorage('content'),
    limits: { fileSize: config.upload.maxSize },
    fileFilter
});

const buildFileUrl = (file, subDir) => {
    const dateDir = getDateDir();
    return `/uploads/${subDir}/${dateDir}/${file.filename}`;
};

router.post('/cover', authMiddleware, coverUpload.single('file'), async (ctx) => {
    if (!ctx.req.file) {
        ctx.throw(400, '请上传图片文件');
    }
    ctx.body = {
        url: buildFileUrl(ctx.req.file, 'cover'),
        filename: ctx.req.file.originalname,
        size: ctx.req.file.size
    };
});

router.post('/content', authMiddleware, contentUpload.single('file'), async (ctx) => {
    if (!ctx.req.file) {
        ctx.throw(400, '请上传图片文件');
    }
    ctx.body = {
        url: buildFileUrl(ctx.req.file, 'content'),
        filename: ctx.req.file.originalname,
        size: ctx.req.file.size
    };
});

module.exports = router;
