const express = require('express');
const TaskController = (taskModel, userModel, authService, googleAPIService) => {
    const router = express.Router();

    router.get('/me', async (req, res)=> {
        if (!req.headers)
            return res.status(400).json({
                message: "Malformed Request"
            });
        const [user_id, user_err] = await authService.getLoggedInUserID(req.headers);
        if (user_id == null) {
            return res.status(400).json({
                data: null,
                error: "Malformed Request " + user_err
            });
        }
        const [task1, err1] = await taskModel.getAllScheduledTasks(user_id);
        const [task2, err2] = await taskModel.getAllNotScheduledTasks(user_id);
        if(err1 != null){
            return res.status(400).json({
                "data": null,
                "error": "Malformed Request in Scheduled Task List: " + err1,
            });
        }
        if(err2 != null){
            return res.status(400).json({
                "data": null,
                "error": "Malformed Request in Not Scheduled Task List: " + err2,
            });
        }
        return res.status(200).json({
            "data": {
                "not_scheduled": task2, 
                "scheduled": task1,
            },
            "error": '',
        });
    })

router.get('/completedTasks', async (req, res)=> {
    if (!req.headers)
        return res.status(400).json({
            message: "Malformed Request"
        });
    const [user_id, user_err] = await authService.getLoggedInUserID(req.headers);
    if (user_id == null) {
        return res.status(400).json({
            data: null,
            error: "Malformed Request " + user_err
        });
    }
    const [completed_tasks, err] = await taskModel.getAllCompletedTasks(user_id);
    if(err != null){
        return res.status(400).json({
            "data": null,
            "error": "Malformed Request in Completed Task List: " + err,
        });
    }
    return res.status(200).json({
        "data": completed_tasks,
        "error": '',
    });
})

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
        } catch(e) {
            return res.status(400).json({
                data: {},
                error: e
            });
        }
    });

    router.post('/', async (req, res) => {
        if (!req.body)
            return res.status(400).json({
                data: null,
                error: "Malformed Request"
            });
        const body = req.body;
        const name = body.name;
        const description = body.description;
        const duration = body.duration;
        const due_date = body.due_date;
        const [user_id_from_request, err1] = await authService.getLoggedInUserID(req.headers);
        if (err1) {
            return res.status(400).json({
                data: {},
                error: err1.message,
            });
        }

        if (name === undefined || duration === undefined || due_date === undefined)
            return res.status(400).json({
                data: {},
                error: "Malformed Request"
            });

        const [task, err2] = await taskModel.createTask(name, description, duration, due_date, user_id_from_request);
        return res.status(200).json({
            data: task,
            error: err2 ? err2.message : ""
        })
    })

    //my attempt to make a POST request for task-complete:
    router.post('/complete', async (req, res) =>{
        if (!req.body)
        return res.status(400).json({
            message: "Malformed Request"
        });
        const body = req.body;
        const ids = body.ids;

        // check if the id object is empty
        if(ids == undefined || ids.length == 0){
            return res.status(400).json({
                data: null,
                error: "Malformed Request"
            });
        }

        const promises = ids.map(id => taskModel.setTaskCompleted(id))
        const rows = await Promise.all(promises)
        
        let completed_arr = []
        rows.forEach(t => {
            if (t[1]) {
                return res.status(400).json({
                    "data": null,
                    "error": t[1],
                })
            }
            completed_arr.push(t[0])
        });

        
        return res.status(200).json({
            "data": completed_arr,
            "error": null,
        })
    })

    router.post('/delete', async (req, res) => {
        const [userID, userErr] = await authService.getLoggedInUserID(req.headers);
        if (userID == null) {
            return res.status(400).json({
                data: null,
                error: "Malformed Request " + userErr
            });
        }

        if (!req.body)
            return res.status(400).json({
                message: "Malformed Request"
            });
        const body = req.body;
        const ids = body.ids;

        // check if the id object is empty
        if (ids == undefined || ids.length == 0) {
            return res.status(400).json({
                data: null,
                error: "Malformed Request"
            });
        }

        // TODO: Check with user which calendar to use (assumes primary right now)
        let [user, retrieveUserError] = await userModel.getUser(userID);
        if (retrieveUserError)
            return res.status(400).json({
                data: null,
                error: "Malformed Request " + retrieveUserError
            });
        const calendarID = user.primary_calendar;
        
        const promises = ids.map(id => taskModel.deleteTask(id))
        const rows = await Promise.all(promises)
        let deleteErrors = [];

        for (let i = 0; i < rows.length; i++)
        {
            let queryRes = rows[i];
            if (queryRes[1])
                deleteErrors.push(queryRes[1]);
            else if (queryRes[0].scheduled) {                
                let [_, calendarErr] = await googleAPIService.deleteEventWithToken(req.headers, calendarID, queryRes[0].event_id);
                if (calendarErr)
                    deleteErrors.push(calendarErr);
            }            
        }

        if (deleteErrors.length > 0)
            return res.status(400).json({
                "data": null,
                "error": deleteErrors
            })

        return res.status(200).json({
            "data": "Success", 
            "error": null,
        })
    });

    router.patch('/:id', async (req, res) => {
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
        if (!req.body)
            return res.status(400).json({
                data: null,
                error: "Malformed Request"
            });
        if (user_id_from_request != task.user_id) {
            // Make sure the requestor has access to this object, if not, Access Denied
            return res.status(403).json({
                data: {},
                error: "Access Denied"
            });
        }

        // get all the info from what the user wants to edit and change it into a string
        const body = req.body;
        const updates = [];

        for (let key in body) {
            if (body.hasOwnProperty(key)) {
                let value = body[key];
                if (typeof(value) === 'string') {
                    const newVal = value.replace(/\'/g, "\'\'");
                    value = newVal;
                }
                updates.push(key + "=" + "\'" + value + "\'");
            }
        }
        const updatedTask = updates.join(",");
        
        const [update, edit_err] = await taskModel.editTask(id, updatedTask);
        if (edit_err)
            return res.status(400).json({
                "data": null,
                "error": "Malformed Request in Edit Task: " + edit_err,
            });
        return res.status(200).json({
            "task": update,
            "error": edit_err,
        });
    })

    return router;
}

module.exports = {
    TaskController
};
