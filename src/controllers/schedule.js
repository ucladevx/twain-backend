const express = require('express');
const axios = require('axios');

const ScheduleController = (taskModel, authService) => {
    const router = express.Router();

    router.post('/', async (req, res) => {
        if (!req.body)
            return res.status(400).json({
                data: null,
                error: "Malformed Request"
            });
        const body = req.body;
        const ids = body.ids;

        if (ids == undefined || ids.length == 0) {
            return res.status(400).json({
                data: null,
                error: "Malformed Request"
            });
        }

        // Get the user_id of the user sending the request
        const [user_id_from_request, err1] = await authService.getLoggedInUserID(req.headers);
        if (err1) {
            return res.status(400).json({
                error: err1.message,
            });
        }

        // Get requested tasks
        const promises = ids.map(id => taskModel.getTask(id));
        const rows = await Promise.all(promises);
        // TODO: if there are no tasks
        let tasks = [];
        rows.forEach(row => {
            let [task, err2] = row;
            // Exit if there is an error
            if (err2) {
                return res.status(400).json({
                    data: null,
                    error: err2
                })
            }
            // Make sure the requestor has access to this task
            try {
                if (user_id_from_request != task.user_id) {
                    return res.status(403).json({
                        data: null,
                        error: "Access Denied"
                    });
                } 
            } catch (e) {
            // in case something weird happens like there's no user_id for that task
                return res.status(400).json({
                    data: null,
                    error: e
                })
            }
            tasks.push(task);
        });

        // Get the user's calendars
        const auth_header = req.headers['authorization'];
        if (auth_header == null) {
            return [null, "No Authorization Received"]
        }

        const [calendar_ids, err3] = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', 
            {
                headers: {
                    Authorization: auth_header
                }
            }
        )
            .then(response => {
                const items = response.data.items;
                const calendar_ids = [];
                for (item of items)
                    calendar_ids.push(item.id);
                
                return [calendar_ids, null];
            })
            .catch(error => {
                return [null, error];
            });

        if (err3) 
            return [null, err3];

        // Get the times the user is busy today
        let today = new Date();
        today.setHours(0, 0, 0, 0);
        let yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        let tomorrow = new Date();
        tomorrow.setHours(23, 59, 59, 59);

        let freebusy_list = [];
        for (calendar of calendar_ids) {
            freebusy_list.push({id: calendar});
        } 
        let today_str = new Date(Date.now()).toISOString()
        let due = tasks[0].due_date

        console.log(today_str)
        console.log(due)

        const [busy_intervals, err4] = await axios.post('https://www.googleapis.com/calendar/v3/freeBusy',
            { 
                timeMin: today_str,
                timeMax: due,
                items: freebusy_list 
            },
            {
                headers: {
                    Authorization: auth_header
                }
            }
        )
            .then(response => {
                const calendars = response.data.calendars;
                let busy_intervals = [];
                                
                for (id in calendars) {
                    if (calendars[id].busy.length) {
                        for (interval of calendars[id].busy) {
                            busy_intervals.push([new Date(interval.start), new Date(interval.end)]);
                        }
                    }
                }

                return [busy_intervals, null];
            })
            .catch (error => {
                return [null, error];
            });

        if (err4) 
            return [null, err4];

        // sorts them by start time, ascending
        busy_intervals.sort((a, b) => {
            return (a[0] - b[0]);
        });

        let unavailable_times = [];
        for (i = 0; i < busy_intervals.length - 1; i++) {
            // combine consecutive busy intervals
            start_time = busy_intervals[i][0];
            end_time = busy_intervals[i][1];
            for (j = i; j < busy_intervals.length; j++) {
                if (busy_intervals[j][0] <= end_time) {
                    end_time = busy_intervals[j][1];
                } else {
                    i = j - 1;
                    break;
                }
            }
            unavailable_times.push([start_time, end_time]);
        }

        let day_start = new Date();
        day_start = today.setHours(8, 0, 0, 0);
        let day_end = new Date();
        day_end = today.setHours(16, 0, 0, 0);

        // get the times the user is free
        let free_times = [];
        for (i = 0; i < unavailable_times.length; i++) {
            if (i == 0) {
                if (unavailable_times[i][0] <= day_start)
                    continue;
                else 
                    free_times.push([day_start, unavailable_times[i][0]]);
            } else if (i == unavailable_times.length - 1) {
                if (unavailable_times[i][0] >= day_end)
                    continue;
                else
                    free_times.push([unavailable_times[i][0], day_end]);
            } else {
                free_times.push([unavailable_times[i - 1][1], unavailable_times[i][0]]);
            }
        }
        console.log(free_times)

        // creates an event
        // TODO: multiple events and updating the free time availability as we schedule
        let google_event_response = null
        for (task of tasks) {
            for (i = 0; i < free_times.length; i++) {
                let free_dur = Math.round((free_times[i][1] - free_times[i][0]) / 1000)  
                if (free_dur >= task.duration) {
                    const [response, err5] = await axios.post('https://www.googleapis.com/calendar/v3/calendars/longerbeamalex@gmail.com/events/',
                        {
                            start: {
                                dateTime: free_times[i][0]
                            },
                            end: {
                                // TODO: make it end after the specified duration
                                dateTime: free_times[i][1]
                            },
                            summary: task.name, 
                            description: task.description
                        },
                        {
                            headers: {
                                Authorization: auth_header
                            }
                        }
                    )
                        .then(response => {
                            return [response, null];
                        })
                        .catch(error => {
                            return [null, error];
                        });
                
                    if (!err5) {
                        google_event_response = response
                        break;
                    } else {
                        console.log("error: " + err5.message)
                    }

                }
            }
        }
        let event_data = google_event_response.data
        console.log(event_data)
        let t = tasks[0]
        let event_id = event_data.id
        let calendar_id = "longerbeamalex@gmail.com"
        let event_start_time = event_data.start.dateTime
        let event_end_time = event_data.end.dateTime

        const [final_task, last_err] = await taskModel.scheduleTask(t.id, event_id, calendar_id, event_start_time, event_end_time)
        return res.status(200).json({
            data: final_task,
            error: last_err
        })
        
    });

    return router;
}

module.exports = {
    ScheduleController
};