const express = require('express');
const moment = require('moment-timezone');

const ScheduleController = (userModel, taskModel, authService, googleAPIService, scheduleService) => {
    const router = express.Router();

    router.post('/', async (req, res) => {
        // Check for headers
        if (!req.headers) {
            return res.status(400).json({
                data: null,
                error: "Malformed Request"
            });
        }

        // Authenticate the user
        const [user_id, user_err] = await authService.getLoggedInUserID(req.headers);
        if (user_id == null) {
            return res.status(400).json({
                data: null,
                error: "Malformed Request " + user_err
            });
        }

        // Get the user's task list (sorted from earliest to latest due)
        const [tasks, task_err] = await taskModel.getTasksForScheduling(user_id, req.body.ids);
        if (task_err != null) {
            return res.status(400).json({
                data: null,
                error: "No unscheduled tasks"
            });
        }

        // Create the freeBusy request
        const [user, _] = await userModel.getUser(user_id);
        const relevantCalendars = user.relevant_calendars.split(',');
        const freeBusyItems = [];

        relevantCalendars.forEach((calendarID) => {
            freeBusyItems.push({
                "id": calendarID
            });
        });

        const freeBusyBody = {
            "timeMin": req.body.timeMin, // in UTC
            "timeMax": tasks[tasks.length - 1].due_date, // in UTC
            "items": freeBusyItems
        };

        // Get the list of busy intervals in UTC
        const [googleBusyInts, int_err] = await googleAPIService.getFreeBusyIntervalsWithToken(req.headers, freeBusyBody);
        if (int_err != null) {
            return res.status(400).json({
                data: null,
                error: "Error retrieving busy intervals"
            });
        }

        // Sort the busy intervals in ascending order of start datetime
        googleBusyInts.sort((a, b) => {
            if (moment(a[0]).isBefore(moment(b[0])))
                return -1;
            else if (moment(a[0]).isAfter(moment(b[0])))
                return 1;
            else
                return 0;
        });

        // TEST CODE - Get the user's free intervals
        // let freeInts = await scheduleService.getFreeIntervals(req.body.timeMin, req.body.timeZone, startHr, endHr, googleBusyInts);        
        // freeInts = freeInts.map(x => x.map(y => moment.unix(y).tz(req.body.timeZone).toISOString(true)));

        const scheduledTasks = await scheduleService.scheduleTasks(tasks, req.body.timeMin, req.body.timeZone,
            user.hours_start, user.hours_end, googleBusyInts);

        for (task of scheduledTasks) {
            if (task.scheduled_time != null) {
                taskModel.scheduleTask(task.id, task.scheduled_time);
            }
        }

        return res.status(200).json({
            data: scheduledTasks,
            error: null
        });
    });

    router.post('/confirm', async (req, res) => {
        // Check for headers
        if (!req.headers)
            return res.status(400).json({
                data: null,
                error: "Malformed Request"
            });

        // Authenticate the user
        const [user_id, user_err] = await authService.getLoggedInUserID(req.headers);
        if (user_id == null) {
            return res.status(400).json({
                data: null,
                error: "Malformed Request " + user_err
            });
        }

        // Create the create event request
        const [user, _] = await userModel.getUser(user_id);
        const targetCalendar = user.primary_calendar;
        // TODO: Allow user to select calendar for scheduling

        // Create Google Calendar events for and confirm the good tasks
        let confirmedTaskList = [];
        const goodIDs = req.body.good_ids;

        for (let i = 0; i < goodIDs.length; i++) {
            let id = goodIDs[i];
            let [task, _] = await taskModel.getTask(id, user_id);

            if (task.scheduled_time == null)
                continue;

            let taskStartString = task.scheduled_time;
            let taskStartMoment = moment(taskStartString);
            let taskEndMoment = taskStartMoment.clone();
            taskEndMoment.add(task.duration, "minutes");

            taskStartString = taskStartMoment.tz(req.body.timeZone).toISOString(true);
            let taskEndString = taskEndMoment.tz(req.body.timeZone).toISOString(true);

            let reqBody = {
                "summary": task.name,
                "description": task.description,
                "start": {
                    "dateTime": taskStartString,
                    "timeZone": req.body.timeZone
                },
                "end": {
                    "dateTime": taskEndString,
                    "timeZone": req.body.timeZone
                }
            }
            let [response, calendarErr] = await googleAPIService.scheduleEventWithToken(req.headers, targetCalendar, reqBody);
            if (calendarErr)
                console.log('Error creating Google Calendar event!', calendarErr)

            let [confirmed_task, confirmErr] = await taskModel.confirmSchedule(id, response.id, targetCalendar, response.htmlLink, taskStartString, taskEndString);
            if (confirmErr)
                console.log('Error confirming task!', confirmErr);
            else
                confirmedTaskList.push(confirmed_task);
        }

        // Force scheduled tasks
        const forceScheduled = req.body.force;

        for (let i = 0; i < forceScheduled.length; i++) {
            let forceTask = forceScheduled[i];
            let [task, _] = await taskModel.getTask(forceTask.id, user_id);

            let taskStartString = forceTask.time;
            let taskStartMoment = moment(taskStartString).tz(req.body.timeZone);
            let taskEndMoment = taskStartMoment.clone().add(task.duration, "minutes");
            let taskEndString = moment(taskEndMoment).toISOString();

            let reqBody = {
                "summary": task.name,
                "description": task.description,
                "start": {
                    "dateTime": taskStartString,
                    "timeZone": req.body.timeZone
                },
                "end": {
                    "dateTime": taskEndString,
                    "timeZone": req.body.timeZone
                }
            }

            let [response, calendarErr] = await googleAPIService.scheduleEventWithToken(req.headers, targetCalendar, reqBody);
            if (calendarErr)
                console.log('Error creating Google Calendar event!', calendarErr)

            let [confirmed_task, confirmErr] = await taskModel.confirmSchedule(forceTask.id, response.id, targetCalendar, response.htmlLink, taskStartString, taskEndString);
            if (confirmErr)
                console.log('Error confirming task!', confirmErr);
            else
                confirmedTaskList.push(confirmed_task);
        }

        return res.status(200).json({
            data: confirmedTaskList,
            error: null
        });
    });

    return router;
}

module.exports = {
    ScheduleController
};