require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/user.model');

connectDB().then(async () => {
    const u = await User.findOne({ email: 'admin@gmail.com' });
    console.log('admin user:', u);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});