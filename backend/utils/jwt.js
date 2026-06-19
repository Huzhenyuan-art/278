const jwt = require('jsonwebtoken');
const defaultConfig = require('../config/default');

const getConfig = () => {
    if (process.env.NODE_ENV === 'test') {
        return require('../config/test');
    }
    return defaultConfig;
};

const config = getConfig();

const signToken = (payload) => {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (err) {
        return null;
    }
};

module.exports = {
    signToken,
    verifyToken
};
