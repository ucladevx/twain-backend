const express = require('express');
const TaskController = (taskModel, authService) => {
    const router = express.Router();

    router.get('/:id', async (req, res) => {
        const params = req.params;
        const id = parseInt(params.id, 10);

        // Get the user_id of the user sending the request
        const [user_id_from_request, err1] = await authService.getLoggedInUserID(req.headers);
        if (err1) {
            return res.status(400).json({
                message: err1.message,
            });
        }

        const [task, err2] = await taskModel.getTask(id);
    
        try {
            if (user_id_from_request != task.user_id) {
                // Make sure the requestor has access to this object, if not, Access Denied
                return res.status(403).json({
                    data: {},
                    error: "Access Denied"
                });
            } else {
                return res.status(200).json({
                    data: task,
                    error: err2 ? err2.message : ""
                })
            }
        } catch {
            return res.status(400).json({
                data: {},
                error: err2.message
            });
        }
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
        const [user_id_from_request, err1] = await authService.getLoggedInUserID(req.headers);
        if (err1) {
            return res.status(400).json({
                data: {},
                error: err1.message,
            });
        }

        if (name === undefined || duration === undefined)
            return res.status(400).json({
                data: {},
                error: "Malformed Request"
            });

        const [task, err2] = await taskModel.createTask(name, description, duration, user_id_from_request);
        return res.status(200).json({
            data: task,
            error: err2 ? err.message : ""
        })
    })

    return router;
}

module.exports = {
    TaskController
};