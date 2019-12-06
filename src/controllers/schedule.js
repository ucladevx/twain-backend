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
        // console.log("User: " + user_id_from_request)

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
        // console.log("Task: " + tasks[0].id)

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
        let now_str = new Date().toISOString()
        let due = tasks[0].due_date

        // console.log(now_str)
        // console.log(due)

        const [busy_intervals, err4] = await axios.post('https://www.googleapis.com/calendar/v3/freeBusy',
            { 
                timeMin: now_str,
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
        // console.log("Busy times: ")
        

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

        // console.log(unavailable_times)

        // let day_start = new Date();
        // day_start = today.setHours(0, 0, 0, 0);
        // let day_end = new Date();
        // day_end = today.setHours(12, 0, 0, 0);

        let day_start_hours = 16
        let day_end_hours = 4

        // get the times the user is free
        let num_unavailable = unavailable_times.length;
        // console.log(num_unavailable)
        let free_times = [];
        for (i = 0; i < num_unavailable; i++) {
            let busy_start = new Date(unavailable_times[i][0])
            let busy_end = new Date(unavailable_times[i][1])

            let busy_start_string = busy_start.toISOString()
            let busy_end_string = busy_end.toISOString()

            busy_start_hours = busy_start.getUTCHours()
            busy_end_hours = busy_end.getUTCHours()
            if (i == 0) {
                // if (busy_start_hours <= day_start_hours)
                //     continue;
                // else {
                //     // Find current day start
                //     if (busy_start_hours >= day_start_hours) {
                //         let f_start = new Date(busy_start).setUTCHours(day_start_hours)
                //         f_start_string = new Date(f_start).toISOString()
                //         free_times.push([f_start_string, busy_start_string]);
                //     } else {
                //         t = new Date(busy_start).setUTCHours(day_start_hours)
                //         let f_start = new Date(Date.parse(t) - 24*60*60*1000)
                //         f_start_string = new Date(f_start).toISOString()
                //         free_times.push([f_start_string, busy_start_string]);
                //     }
                // }
                free_times.push([now_str, busy_start_string]);
            } 
            // Ideally the last interval does everything in the final else as well as the final interval below
            // Commenting out for now until we figure out exactly what due dates look like
            // else if (i == unavailable_times.length - 1) {
            //     if (busy_end_hours >= day_end_hours && busy_end_hours >= day_start_hours)
            //         continue;
            //     else {
            //         // Find current day end
            //         if (busy_end_hours <= day_end_hours) {
            //             f_end = new Date(busy_end).setUTCHours(day_end_hours)
            //             free_times.push([busy_end, f_end]);
            //         } else {
            //             t = new Date(busy_end).setUTCHours(day_end_hours)
            //             f_end = new Date(Date.parse(t) + 24*60*60*1000)
            //             free_times.push([busy_end, f_end]);
            //         }
            //     }
            // }
             else {
                last_busy_end = new Date(unavailable_times[i-1][1])
                last_busy_end_string = last_busy_end.toISOString()

                last_busy_end_hours = last_busy_end.getUTCHours()
                date_diff = busy_start.getUTCDate() - last_busy_end.getUTCDate()
                // console.log("START NEW **** with i=" + i)
                // console.log("Last Busy End Hours: " + last_busy_end_hours)
                // console.log("Busy Start Hours: " + busy_start_hours)
                // console.log("date diff: " + date_diff)
                // IF DATE DIFF == 1
                let interval = [0,0]
                if (date_diff == 1) {
                    // last_busy_end_hours > day_end and start_time < day_start
                    if (last_busy_end_hours >= day_start_hours && busy_start_hours <= day_end_hours) {
                        // Normal interval
                        interval = [last_busy_end_string, busy_start_string]
                    } else if (last_busy_end_hours >= day_start_hours && busy_start_hours >= day_end_hours) {
                         // last busy end until start_time_day at day_end
                         f_end = new Date(busy_start).setUTCHours(day_end_hours)
                         f_end_string = new Date(f_end).toISOString()
                         interval = [last_busy_end_string, f_end_string]
                     } else if (last_busy_end_hours <= day_start_hours && busy_start_hours <= day_end_hours) {
                        // last_busy_end day at day_start until start_time
                        f_start = new Date(last_busy_end).setUTCHours(day_start_hours)
                        f_start_string = new Date(f_start).toISOString()
                        interval = [f_start_string, busy_start_string]
                     } else if (last_busy_end_hours <= day_start_hours && busy_start_hours >= day_end_hours) {
                        // last_busy_end day at day_start until start_time day at day_end
                        // Full day free case
                        f_start = new Date(last_busy_end).setUTCHours(day_start_hours)
                        f_start_string = new Date(f_start).toISOString()

                        f_end = new Date(busy_start).setUTCHours(day_end_hours)
                        f_end_string = new Date(f_end).toISOString()
                        interval = [f_start_string, f_end_string]
                     }
                } else { // Date_diff == 0
                    if (last_busy_end_hours <= day_end_hours && busy_start_hours <= day_end_hours) {
                        // normal interval
                        interval = [last_busy_end_string, busy_start_string]
                    } else if (last_busy_end_hours <= day_end_hours && busy_start_hours >= day_end_hours && busy_start_hours <= day_start_hours) {
                        // last_busy_end until same day at day_end
                        f_end = new Date(last_busy_end).setUTCHours(day_end_hours)
                        f_end_string = new Date(f_end).toISOString()
                        interval = [last_busy_end_string, f_end_string]
                    } else if (last_busy_end_hours <= day_end_hours && busy_start_hours >= day_start_hours) {
                        // Two intervals, end of one day and beginning of next
                        f_start = new Date(busy_start).setUTCHours(day_start_hours)
                        f_start_string = new Date(f_start).toISOString()

                        f_end = new Date(last_busy_end).setUTCHours(day_end_hours)
                        f_end_string = new Date(f_end).toISOString()
                        // console.log("Extra push: " + [last_busy_end_string, f_end_string])
                        free_times.push([last_busy_end_string, f_end_string])
                        interval = [f_start_string, busy_start_string]
                    } else if (last_busy_end_hours <= day_start_hours && busy_start_hours >= day_start_hours) {
                        f_start = new Date(busy_start).setUTCHours(day_start_hours)
                        f_start_string = new Date(f_start).toISOString()

                        interval = [f_start_string, busy_start_string]
                    } else if (last_busy_end_hours >= day_start_hours && busy_start_hours >= day_start_hours) {
                        // Normal interval
                        // console.log("Day 0 normal with i=" + i)
                        interval = [last_busy_end_string, busy_start_string]
                    } else {
                        // Both between day_end and day_start
                        // nothing
                        continue;
                    }                
                }
                // console.log("pushing interval: " + interval)
                free_times.push(interval)
            }
        }
        console.log("Free times: ")
        console.log(free_times)

        // creates an event
        // TODO: multiple events and updating the free time availability as we schedule
        let google_event_response = null
        for (task of tasks) {
            for (i = 0; i < free_times.length; i++) {
                let free_dur = Math.round((new Date(free_times[i][1]) - new Date(free_times[i][0])) / 1000)  
                if (free_dur >= (task.duration * 60)) {
                    end_time_iso_str = new Date(Date.parse(free_times[i][0]) + task.duration * 60000).toISOString();
            
                    // console.log("End time")
                    // console.log(end_time_iso_str)
                    const [response, err5] = await axios.post('https://www.googleapis.com/calendar/v3/calendars/longerbeamalex@gmail.com/events/',
                        {
                            start: {
                                dateTime: free_times[i][0]
                            },
                            end: {
                                // TODO: make it end after the specified duration
                                dateTime: end_time_iso_str
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
        if (google_event_response === null) {
            return res.status(400).json({
            data: null,
            error: "Not able to schedule"
        })
        }
        let event_data = google_event_response.data
        // console.log(event_data)
        let t = tasks[0]
        let event_id = event_data.id
        let calendar_id = "longerbeamalex@gmail.com"
        let event_start_time = new Date(event_data.start.dateTime).toISOString()
        let event_end_time = new Date(event_data.end.dateTime).toISOString()

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