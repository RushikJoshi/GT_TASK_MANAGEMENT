require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/user.model');
const bcrypt = require('bcryptjs');

/*
 * PHASE 5 EXPLANATIONS:
 * 
 * - Why admin auto-creation is needed:
 *   With public signup completely removed, the system needs a secure entry point. 
 *   We inject a default super admin on server start so the highest-level authority 
 *   can login and start provisioning manager and employee accounts.
 */
const initAdminUser = async () => {
    try {
        const adminEmail = "admin@gmail.com";
        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("admin@123", salt);

            await User.create({
                fullName: "Super Admin",
                email: adminEmail,
                password: hashedPassword,
                role: "admin",
                department: "Master Control",
                jobTitle: "System Administrator",
                status: "ACTIVE"
            });
            console.log("Default Built-in Admin created successfully!");
        } else {
            // ensure existing record has correct admin role
            if (adminExists.role !== 'admin') {
                adminExists.role = 'admin';
                await adminExists.save();
                console.log("Existing user updated to admin role.");
            } else {
                console.log("Built-in Admin already exists. Auto-creation skipped.");
            }
        }
    } catch (error) {
        console.error("Error creating default Admin user:", error);
    }
};

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB()
    .then(async () => {
        // Run the script to initialize admin only once on connect
        await initAdminUser();

        // Start Node Express Server
        app.listen(PORT, () => {
            console.log(`Server is running on port: ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Failed to start server. MongoDB connection error:", err.message);
        process.exit(1);
    });
