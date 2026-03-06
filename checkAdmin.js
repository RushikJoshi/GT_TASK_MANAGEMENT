require('dotenv').config();
const connectDB = require('./backend/config/db');
const User = require('./backend/models/user.model');

connectDB().then(async () => {
    const u = await User.findOne({ email: 'admin@gmail.com' });
    console.log('admin user:', u);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});