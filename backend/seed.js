const bcrypt = require('bcryptjs');
const config = require('./config/default');
const User = require('./models/user');

const createUser = async ({ username, password, email, role }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, email, role });
    console.log(`Seed ${role} created: username="${username}"`);
};

const seedUsers = async () => {
    const count = await User.count();
    if (count > 0) {
        return;
    }

    await createUser({ ...config.seedAdmin, role: 'admin' });
    await createUser({ ...config.seedUser, role: 'user' });
};

module.exports = { seedUsers };
