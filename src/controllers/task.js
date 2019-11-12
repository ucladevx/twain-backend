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


    //my attempt to make a POST request for task-complete:
    router.post('/complete_task', async (req, res) =>{
        if (!req.body)
        return res.status(400).json({
            message: "Malformed Request"
        });
    const body = req.body;
    const ids = body.ids;
    //const promises = ids.map(id => taskModel.setTaskComplete(id))
    //const rows = await Promise.all(promises)
    // ask Alex about for loops because it makes more sense to have it by one single ID because 
    // would not send other user IDs
    // ask what we want if some of the updates fail, fial the whole request?
    // let completed_arr = []
    // for await (id of ids) {
    //     const [data, err] = await taskModel.setTaskComplete(id)
    //     if (err) {
    //         return res.status(400).json({
    //             "data": null,
    //             "error": err.message,
    //         })
    //     }
    //     completed_arr.push(data)
    // }
    const promises = ids.map(id => taskModel.setTaskCompleted(id))
    const rows = await Promise.all(promises)
    console.log(rows)
    let completed_arr = []
    rows.forEach(t => {
        if (t[1]) {
            return res.status(400).json({
                "data": null,
                "error": t[1].message,
            })
        }
        completed_arr.push(t[0])
    });

    
    return res.status(200).json({
        "data": completed_arr,
        "error": '',
    })


    })

    return router;
}

module.exports = {
    TaskController
};