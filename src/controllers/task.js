const express = require('express');
const TaskController = (taskModel) => {
    const router = express.Router();

    router.get('/:id', async (req, res) => {
        const params = req.params;
        const id = parseInt(params.id, 10);
        const [task, err] = await taskModel.getTask(id);
        if (err) {
            return res.status(400).json({
                message: err.message
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
                error: "Malformed Request"
            });
        const body = req.body;
        if (!("name" in body))
            return res.status(400).json({
                error: "Malformed Request"
            })

        const name = body.name;
        const description = body.description;
        const duration = body.duration;
        const [data, err] = await taskModel.createTask(name, description, duration);
        return res.status(200).json({
            data: {
                id: data.id
            },
            error: err ? err.message : ""
        })
    })

    return router;
}

module.exports = {
    TaskController
};