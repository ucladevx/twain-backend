const express = require('express');
const moment = require('moment-timezone');

const ScheduleController = (userModel, taskModel, authService, googleAPIService, solve) => {
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
    
        // Sort the busy intervals in ascending order of start datetime
        googleBusyInts.sort((a, b) => {
            if (moment(a[0]).isBefore(moment(b[0])))
                return -1;
            else if (moment(a[0]).isAfter(moment(b[0])))
                return 1;
            else
                return 0;
        });

        // Convert the busy intervals to moments
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

        // Expects a moment object
        function validTime(momentObj) {
            if (momentObj.hour() >= startHr && momentObj.hour() < endHr) {
                console.log('within hours of operation');
                return 0;
            }
            else if (momentObj.hour() < startHr) {
                console.log('before hours of operation');
                return -1;
            }
            else if (momentObj.hour() >= endHr) {
                console.log('after hours of operation');
                return 1;   
            }
            console.log('what');
        }

        // Create free intervals from busy intervals in user's local time
        let freeInts = [];
        let lastEndTime = moment(req.body.timeMin).tz(req.body.timeZone);
        busyMomInts.forEach((busyInt) => {
            // Because of overalpping busy intervals, we need this check
            if (lastEndTime.isBefore(busyInt[0])) {
                // Check if the interval happens on the same day
                if (lastEndTime.isSame(busyInt[0], "day")) {
                    console.log("same day");
                    // Check if the interval is within hours of operation
                    if (validTime(lastEndTime) == 0 && validTime(busyInt[0]) == 0) {
                        console.log("\tin hours of operation")
                        freeInts.push([lastEndTime.format(), busyInt[0].format()]);
                    }
                    // Check if the interval starts before hours of operation... 
                    else if (validTime(lastEndTime) == -1) {
                        console.log("\tstarts before hours of operation");
                        let intStart = lastEndTime.clone();
                        intStart.hour(startHr).minute(0).second(0).millisecond(0);
                        // ... and ends within
                        if (validTime(busyInt[0]) == 0) {
                            console.log("\t\tends within hours of operation");
                            freeInts.push([intStart.format(), busyInt[0].format()])
                        }                            
                        // ... and ends after
                        else if (validTime(busyInt[0] == 1)) {
                            console.log("\t\tends after hours of operation");
                            let intEnd = busyInt[0].clone();
                            intEnd.hour(endHr).minute(0).second(0).millisecond(0);
                            freeInts.push([intStart.format(), intEnd.format()]);
                        }
                        // If the interval ends before hours of operation, do nothing!
                        console.log([lastEndTime.format(), busyInt[0].format()]);
                    }
                }
                // At this point in the code, we don't need to worry if the interval is in reverse
                // since we already checked if lastEndTime comes before busyInt[0], so this is just
                // a check if the interval ends one day in the future.
                else if (busyInt[0].date() - lastEndTime.date() == 1) {
                    console.log("different day")
                    // Check if the start is within hours of operation
                    if (validTime(lastEndTime) == 0) {
                        console.log("\tstarts within hours of operation");
                        let intEnd = lastEndTime.clone();
                        intEnd.hour(endHr).minute(0).second(0).millisecond(0);
                        freeInts.push([lastEndTime.format(), intEnd.format()]);
                    }
                    // Check if the end is within hours of operation
                    if (validTime(busyInt[0]) == 0) {
                        console.log("\tends within hours of operation")
                        let intStart = busyInt[0].clone();
                        intStart.hour(startHr).minute(0).second(0).millisecond(0);
                        freeInts.push([intStart.format(), busyInt[0].format()]);
                    }
                    // If neither are within hours of operation, do nothing!
                }
                // If the interval ends greater than a day in the future...
                else if (busyInt[0].date() - lastEndTime.date() > 1) {
                    // Then we can add the whole day
                    let intStart = lastEndTime.clone()
                    intStart.hour(startHr).minute(0).second(0).millisecond(0);
                    let intEnd = intStart.clone();
                    intEnd.hour(endHr).minute(0).second(0).millisecond(0);

                    freeInts.push([intStart.format(), intEnd.format()]);
                }
            }
            // We can't skip any days!
            if (busyInt[0].date() > lastEndTime.date() + 1) {
                lastEndTime.add(1, "days");
                lastEndTime.hour(startHr).minute(0).second(0).millisecond(0);
                console.log('rewind a day!');
            }
            else
                lastEndTime = busyInt[1];
        });
        // TODO: I don't know if this function gets the very last free interval (up to the last due date)

        // Print for debugging purposes
        console.log("FREE INTERVALS");
        freeInts.forEach((freeInt) => {
            console.log(freeInt);
        });
        console.log();

        // TODO: Make it so that freeInts is already in seconds since epoch so we don't have to convert
        freeInts = freeInts.map((interval) => {
            return [
                moment(interval[0]).unix(), 
                moment(interval[1]).unix()
            ];
        });

        function isValidTask(task) {
            const due = task.due_date;
            const duration = task.duration;
            const start = task.scheduled_time;
            return start + duration <= due;
        }

        //  Arguments:
        //      tasks - An array of task objects, as defined by the task model. Sorted from earliest
        //          to latest due date.
        //      freeTime - An array of two-element arrays, each representing an interval of free time.
        //          The times should be in seconds since epoch.
        function solve(tasks, freeTime) {
            if (tasks.length == 0) 
                return [];

            let currTask = tasks[0]; // assume ordered by due date (earliest to latest)
            const tDuration = currTask.duration;
            let newFreeTime = 0;

            freeTime.forEach((freeInt) => {
                iDuration = freeInt[1] - freeInt[0];
                if (tDuration <= iDuration) {
                    // Set task start time to beginning of interval
                    currTask.scheduled_time = freeInt[0];

                    // Check that start_time + duration <= due_date
                    if (!isValidTask(currTask)) {
                        // We can't schedule the event
                        currTask.scheduled_time = null;
                        return [currTask].concat(solve(tasks.slice(1), freeTime));
                    }

                    if (tDuration < iDuration) {
                        let newInt = [freeInt[0] + tDuration, freeInt[1]];
                        newFreeTime = [newInt].concat(freeTime.slice(1));
                    }
                    else if (tDuration == iDuration) 
                        newFreeTime = freeTime.slice(1);

                    let result = solve(tasks.slice(1), newFreeTime);

                    if (result.length > 0)
                        return [currTask].concat(result);
                    else 
                        return [];
                }
            });

            // Not solvable with any placement of the first event, solve the rest
            return [currTask].concat(solve(tasks.slice(1), freeTime));
        }

        // Convert to local datetimes
        scheduledTaskList = solve(tasks, freeInts);
        for (let i = 0; i < scheduledTaskList.length; i++) {
            let dt = scheduledTaskList[i].scheduled_time;
            scheduledTaskList[i].scheduled_time = moment.unix(dt).tz(req.body.timeZone);
        }

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