const sequelize = require('../utils/db');
const User = require('./user');
const Article = require('./article');
const Like = require('./like');
const Tag = require('./tag');
const ArticleTag = require('./articleTag');

// Define Associations
User.hasMany(Article, { foreignKey: 'authorId' });
Article.belongsTo(User, { foreignKey: 'authorId' });

User.hasMany(Like, { foreignKey: 'userId' });
Like.belongsTo(User, { foreignKey: 'userId' });

Article.hasMany(Like, { foreignKey: 'articleId' });
Like.belongsTo(Article, { foreignKey: 'articleId' });

Article.belongsToMany(Tag, { through: ArticleTag, foreignKey: 'articleId', otherKey: 'tagId' });
Tag.belongsToMany(Article, { through: ArticleTag, foreignKey: 'tagId', otherKey: 'articleId' });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initDb = async (retries = 10, interval = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('Connection has been established successfully.');
            
            // Sync models
            await sequelize.sync({ alter: true }); 
            console.log('Database synchronized.');

            const { seed } = require('../seed');
            await seed();
            return;
        } catch (error) {
            console.error(`Unable to connect to the database (Attempt ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                console.log(`Retrying in ${interval / 1000} seconds...`);
                await sleep(interval);
            }
        }
    }
    console.error('Failed to connect to the database after multiple attempts. Exiting...');
    process.exit(1);
};

module.exports = {
    sequelize,
    User,
    Article,
    Like,
    Tag,
    ArticleTag,
    initDb
};
