require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');
const bcrypt = require('bcryptjs');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('employee@123', salt);
    
    let emp = await User.findOne({ email: 'dhirenmakwana009@gmail.com' });
    if (!emp) {
        emp = await User.create({
            fullName: 'Dhiren Makwana',
            email: 'dhirenmakwana009@gmail.com',
            password: password,
            role: 'employee'
        });
        console.log('Employee created');
    } else {
        emp.role = 'employee';
        await emp.save();
        console.log('Employee updated to role: employee');
    }

    const managerPassword = await bcrypt.hash('manager@123', salt);
    let mgr = await User.findOne({ email: 'manager@gmail.com' });
    if (!mgr) {
        mgr = await User.create({
            fullName: 'Manager User',
            email: 'manager@gmail.com',
            password: managerPassword,
            role: 'manager'
        });
        console.log('Manager created (manager@gmail.com)');
    } else {
        mgr.role = 'manager';
        await mgr.save();
        console.log('Manager updated to role: manager');
    }
    
    console.log('Done');
    process.exit(0);
}
seed().catch(console.error);
