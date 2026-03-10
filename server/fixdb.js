const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/gt_task_management')
    .then(async () => {
        const res = await mongoose.connection.db.collection('tasks').updateMany(
            { status: 'Todo' },
            { $set: { status: 'To Do' } }
        );
        console.log(res);
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
