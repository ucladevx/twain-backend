const express = require('express');
const TaskController = (taskModel) => {
    const router = express.Router();

    // /task/:id GET
    /* 
    Parameters:
        id - Supplied in the URL. Used to indicate the task you are requesting.
    Returns:
        Success - 200 Status Code
        {
            "data": {
                "id": int,
                "name": string,
                "description": string,
                "duration": int
                "scheduled": boolean,
                "completed": boolean
            }
        } 
        Error - 400 Status Code
        {
            "message": string
        }
    */
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
            data: task
        });
    });

    // /event POST
    /* 
    Parameters:
        {
            "name": string,
            "description": string,
            "duration": int
        }
    Returns:
        Success - 200 Status Code
        {
            "data": {
                "id": int
            }
        }
        Error - 400 Status Code
        {
            "message": string
        }
    */
    router.post('/', async (req, res) => {
        if (!req.body)
            return res.status(400).json({
                message: "Malformed Request"
            });
        const body = req.body;
        const name = body.name;
        const description = body.description;
        const duration = body.duration;
        const [data, err] = await taskModel.createTask(name, description, duration);
        if (err) {
            return res.status(400).json({
                message: err.message
            });
        }
        return res.status(200).json({
            data: {
                id: data.id
            }
        })
    })

    return router;
}

module.exports = {
    TaskController
};