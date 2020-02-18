const moment = require('moment-timezone');
const SECONDS_PER_MINUTE = 60;

const ScheduleService = () => {
    // Checks if the given Moment object is withint the user's hours of operation.
    // Arguments:
    //      momentObj (Moment) -> A moment object.
    //      startHr (integer) -> The beginning of the user's hours of operation.
    //      endHr (integer) -> The end of the user's hours of operation.
    // Returns:
    //      0, if within hours of operation.
    //      -1, if before
    //      1, if after
    function validTime(momentObj, startHr, endHr) {
        if (momentObj.hour() >= startHr && momentObj.hour() < endHr) {
            console.log('within hours of operation');
            return 0;
        } else if (momentObj.hour() < startHr) {
            console.log('before hours of operation');
            return -1;
        } else if (momentObj.hour() >= endHr) {
            console.log('after hours of operation');
            return 1;
        }
    }

    // Checks if the given task will end before its due date.
    // Arguments:
    //      task (Task object) -> A task object, as defined by the task model.
    // Returns:
    //      True if the task is valid, False otherwise.
    function isValidTask(task) {
        const due = moment(task.due_date).unix();
        const duration = task.duration * SECONDS_PER_MINUTE;
        const start = task.scheduled_time;
        return start + duration <= due;
    }

    // Create free intervals from busy Moment intervals in user's local time
    // Arguments:
    //      timeMin (UTC datetime) -> The earliest time to start scheduling.
    //      timeZone (string) -> The user's local timezone.
    //      busyMomInts ([Moment]) -> An array of Moment objects representing the 
    //          user's busy intervals.
    //      startHr (integer) -> The user's start to hours of operation.
    //      endHr (integer) -> The user's end to hours of operation.
    // Returns:
    //      An array of free intervals in formatted date strings (local time).
    // TODO: I don't know if this function gets the very last free interval 
    //      (up to the last due date)
    const createFreeIntervals = async(timeMin, timeZone, busyMomInts, startHr, endHr) => {
        let freeInts = [];
        let lastEndTime = moment(timeMin).tz(timeZone);
        busyMomInts.forEach((busyInt) => {
            // Because of overalpping busy intervals, we need this check
            if (lastEndTime.isBefore(busyInt[0])) {
                // Check if the interval happens on the same day
                if (lastEndTime.isSame(busyInt[0], "day")) {
                    console.log("same day");
                    // Check if the interval is within hours of operation
                    if (validTime(lastEndTime, startHr, endHr) == 0 && validTime(busyInt[0], startHr, endHr) == 0) {
                        console.log("\tin hours of operation")
                        freeInts.push([lastEndTime.format(), busyInt[0].format()]);
                    }
                    // Check if the interval starts before hours of operation... 
                    else if (validTime(lastEndTime, startHr, endHr) == -1) {
                        console.log("\tstarts before hours of operation");
                        let intStart = lastEndTime.clone();
                        intStart.hour(startHr).minute(0).second(0).millisecond(0);
                        // ... and ends within
                        if (validTime(busyInt[0], startHr, endHr) == 0) {
                            console.log("\t\tends within hours of operation");
                            freeInts.push([intStart.format(), busyInt[0].format()])
                        }
                        // ... and ends after
                        else if (validTime(busyInt[0], startHr, endHr) == 1) {
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
                    if (validTime(lastEndTime, startHr, endHr) == 0) {
                        console.log("\tstarts within hours of operation");
                        let intEnd = lastEndTime.clone();
                        intEnd.hour(endHr).minute(0).second(0).millisecond(0);
                        freeInts.push([lastEndTime.format(), intEnd.format()]);
                    }
                    // Check if the end is within hours of operation
                    if (validTime(busyInt[0], startHr, endHr) == 0) {
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
            } else
                lastEndTime = busyInt[1];
        });

        return freeInts;
    }

    // Arguments:
    //      tasks (Task Object) -> An array of task objects, as defined by the task model. 
    //          Sorted from earliest to latest due date.
    //      freeTime ([[integer, integer]]) -> An array of two-element arrays, each 
    //          representing an interval of free time. The times should be in seconds since
    //          epoch.
    // Returns:
    //      An array of Task objects with scheduled start times. If a task cannot be scheduled,
    //      its start time is set to null.
    const scheduleTasks = (tasks, freeTime) => {
        if (tasks.length == 0)
            return tasks;

        let currTask = tasks[0]; // assume ordered by due date (earliest to latest)
        let tDuration = currTask.duration * SECONDS_PER_MINUTE;

        for (let i = 0; i < freeTime.length; i++) {
            let freeInt = freeTime[i];
            let iDuration = freeInt[1] - freeInt[0];

            if (tDuration <= iDuration) {
                // Set task start time to beginning of interval
                currTask.scheduled_time = freeInt[0];

                // Check that start_time + duration <= due_date
                if (!isValidTask(currTask)) {
                    // We can't schedule the event
                    currTask.scheduled_time = null;
                    return [currTask].concat(scheduleTasks(tasks.slice(1), freeTime));
                }

                let newFreeTime;
                if (tDuration < iDuration) {
                    let newInt = [freeInt[0] + tDuration, freeInt[1]];
                    newFreeTime = [newInt].concat(freeTime.slice(0, i).concat(freeTime.slice(i + 1)));
                } else if (tDuration == iDuration)
                    newFreeTime = freeTime.slice(0, i).concat(freeTime.slice(i + 1))

                // Sort newFreeTime
                newFreeTime.sort((intA, intB) => {
                    if (intA[0] < intB[0])
                        return -1;
                    else if (intA[0] == intB[0])
                        return 0;
                    else
                        return 1;
                });

                if (newFreeTime[0][0] == currTask.scheduled_time)
                    newFreeTime.splice(i, 1);

                let result = scheduleTasks(tasks.slice(1), newFreeTime);
                return [currTask].concat(result);
            }
        };

        // Not solvable with any placement of the first event, solve the rest
        return [currTask].concat(scheduleTasks(tasks.slice(1), freeTime));
    }

    return {
        createFreeIntervals,
        scheduleTasks
    }
}

module.exports = {
    ScheduleService
}