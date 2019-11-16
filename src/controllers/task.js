const express = require('express');
const TaskController = (taskModel) => {
    const router = express.Router();

    router.get('/:id', async (req, res) => {
        const params = req.params;
        const id = parseInt(params.id, 10);
        const [task, err] = await taskModel.getTask(id);
        if (err) {
            return res.status(400).json({
                data: {}, 
                error: err.message
            });
        }
        return res.status(200).json({
            data: task,
            error: err ? err.message : ""
        });
    });

    router.post('/', async (req, res) => {
        if (!req.body)
            return res.status(400).json({
                data: {},
                error: "Malformed Request"
            });
        const body = req.body;
        const name = body.name;
        const description = body.description;
        const duration = body.duration;

        if (name === undefined || duration === undefined)
            return res.status(400).json({
                data: {},
                error: "Malformed Request"
            });

        const [task, err] = await taskModel.createTask(name, description, duration);
        return res.status(200).json({
            data: task,
            error: err ? err.message : ""
        })
    })

    return router;
}

module.exports = {
    TaskController
};