const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');

const taskRoutes = require('./routes/task.routes');
const projectRoutes = require('./routes/project.routes');
const activityRoutes = require('./routes/activity.routes');
const notificationRoutes = require('./routes/notification.routes');
const userRoutes = require('./routes/user.routes');
const dailyReportRoutes = require('./routes/dailyReport.routes');
const customStageRoutes = require('./routes/customStage.routes');
const subtaskRoutes = require('./routes/subtask.routes');
const quickTaskRoutes = require('./routes/quickTask.routes');

const app = express();

// ✅ CORS — must be FIRST, before all other middleware
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = (process.env.CORS_ORIGIN || 'https://task.gitakshmi.com')
            .split(',')
            .map(o => o.trim());
        // Allow no-origin requests (Postman, mobile apps, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS: ' + origin));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ✅ Helmet after CORS
app.use(helmet({
    crossOriginResourcePolicy: false,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/daily-reports', dailyReportRoutes);
app.use('/api/custom-stages', customStageRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/quick-tasks', quickTaskRoutes);

// Health Route
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running finely!' });
});

module.exports = app;
