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

        console.log(tasks);

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

        console.log(freeBusyBody);

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

        // Print for debugging purposes
        console.log("BUSY INTERVALS");
        busyMomInts.forEach((busyInt) => {
            console.log([busyInt[0].format(), busyInt[1].format()]);
        });
        console.log();

        // Get user's hours of operation (should be in 24hr format)
        const startHr = user.hours_start;
        const endHr = user.hours_end;

        // Get the user's free intervals
        let freeInts = await scheduleService.createFreeIntervals(req.body.timeMin, req.body.timeZone, busyMomInts, startHr, endHr);
        // Print for debugging purposes
        console.log("FREE INTERVALS");
        freeInts.forEach((freeInt) => {
            console.log(freeInt);
        });
        console.log();

        // Schedule tasks
        // TODO: Make it so that freeInts is already in seconds since epoch so we don't have to convert
        freeInts = freeInts.map((interval) => {
            return [
                moment(interval[0]).unix(), 
                moment(interval[1]).unix()
            ];
        });
        scheduledTaskList = scheduleService.scheduleTasks(tasks, freeInts);

        // Convert to local datetimes
        for (let i = 0; i < scheduledTaskList.length; i++) {
            let dt = scheduledTaskList[i].scheduled_time;
            if (dt != null) {
                dt = moment.unix(dt);
                scheduledTaskList[i].scheduled_time = dt.tz(req.body.timeZone).format();
            }
        }

        // TODO: Actually save changes to our tasks in the database
        // (Right now, we just return a copy.)

        return res.status(200).json({
            data: scheduledTaskList,
            error: null
        });
    });

    return router;
}

module.exports = {
    ScheduleController
};