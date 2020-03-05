const express = require('express');
const moment = require('moment-timezone');

const ScheduleController = (userModel, taskModel, authService, googleAPIService, scheduleService) => {
    const router = express.Router();

    router.post('/', async(req, res) => {
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
            freeBusyItems.push({"id": calendarID});
        });

        const freeBusyBody = {
            "timeMin": req.body.timeMin, // in UTC
            "timeMax": tasks[tasks.length - 1].due_date, // in UTC
            "timeZone": req.body.timeZone, // user's local timezone
            "items": freeBusyItems
        };

        // Get the list of busy intervals in user's local time
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

        // Convert the busy intervals to Moments
        const busyMomInts = googleBusyInts.map((interval) => {
            return [
                moment(interval[0]).tz(req.body.timeZone), 
                moment(interval[1]).tz(req.body.timeZone)
            ];
        });

        // Get user's hours of operation (should be in 24hr format)
        const startHr = user.hours_start;
        const endHr = user.hours_end;

        // Get the user's free intervals
        let freeInts = await scheduleService.createFreeIntervals(req.body.timeMin, req.body.timeZone, busyMomInts, startHr, endHr);

        // Schedule tasks
        freeInts = freeInts.map((interval) => {
            return [
                moment(interval[0]).unix(), 
                moment(interval[1]).unix()
            ];
        });
        scheduledTaskList = scheduleService.scheduleTasks(tasks, freeInts);

        // Convert to ISO Strings
        for (let i = 0; i < scheduledTaskList.length; i++) {
            let dt = scheduledTaskList[i].scheduled_time;
            if (dt != null) {
                let scheduledISOString = moment.unix(dt).toISOString();
                scheduledTaskList[i].scheduled_time = scheduledISOString;
                await taskModel.scheduleTask(scheduledTaskList[i].id, scheduledISOString);
            }
        }

        return res.status(200).json({
            data: scheduledTaskList,
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

            let taskStartString = task.scheduled_time
            let taskStartMoment = moment(taskStartString).tz(req.body.timeZone);
            let taskEndMoment = taskStartMoment.clone().add(task.duration, "minutes");
            let taskEndString = taskEndMoment.toISOString();

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