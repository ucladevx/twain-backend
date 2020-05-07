const moment = require('moment-timezone');
const _ = require('lodash');
const SECONDS_PER_MINUTE = 60;

const ScheduleService = () => {
    // Helper function to convert a time into its seconds since epoch equivalent
    function getUnix(time) {
        return moment(time).unix();
    }

    /**
     * Summary. Gets intervals of free time between the given start and end time.
     * 
     * Description. Free time intervals are created from non-busy intervals within the user's
     * defined hours of operation. The created intervals will not overlap with each other.
     * 
     * @see GoogleApiService.getFreeBusyIntervalsWithToken()
     * 
     * @param {*}       startTime           Earliest time a free interval can start.
     * @param {string}  localTZ             The user's local timezone.
     * @param {Array}   hoursOfOpStart      Beginning of hours of operation.
     * @param {Array}   hoursOfOpEnd        End of hours of operation.       
     * @param {Array}   busyIntervals       An array of busyInterval arrays.
     * 
     * @return {Array} An array of free intervals in Unix time.
     */
    const getFreeIntervals = async (startTime, localTZ, hoursOfOpStart, hoursOfOpEnd, busyIntervals) => {
        /* 
         * Assuming that startTime is at or after the beginning of hours of operation but before
         * the end of hours of operation.
         */

        // Constants
        const START = 0;
        const END = 1;

        // For when we allow the user more flexibility with start time:
        // const hoursOfOpStartArr = hoursOfOpStart.split(':').map(x => parseInt(x));
        // const hoursOfOpEndArr = hoursOfOpEnd.split(':').map(x => parseInt(x));

        const hoursOfOpStartArr = [hoursOfOpStart, 0];
        const hoursOfOpEndArr = [hoursOfOpEnd, 0];

        // Helper function to check if a time is within a given interval
        function inInterval(unixTime, interval) {
            return (
                unixTime >= getUnix(interval[START]) &&
                unixTime < getUnix(interval[END])
            )
        }

        // Helper function for converting to moment object in local time
        function local(unixTime) {
            return moment.unix(unixTime).tz(localTZ);
        }

        // Helper function to check if a time is within hours of operation
        function inHoursOfOp(unixTime) {
            const localTime = local(unixTime);

            const afterHoursStart = (
                localTime.hour() >= hoursOfOpStartArr[0] &&
                localTime.minute() >= hoursOfOpStartArr[1]
            );

            const beforeHoursEnd = (
                localTime.hour() < hoursOfOpEndArr[0] ||
                (localTime.hour() == hoursOfOpEndArr[0] &&
                    localTime.minute() < hoursOfOpEndArr[1])
            );

            return afterHoursStart && beforeHoursEnd;
        }

        // Helper function to get beginning of next day
        function getStartTime(unixTime) {
            let currentDay = moment.unix(unixTime).tz(localTZ);
            currentDay.hour(hoursOfOpStartArr[0]);
            currentDay.minute(hoursOfOpStartArr[1]);
            currentDay.second(0).millisecond(0);
            unixCurrent = currentDay.unix();

            let nextDay = currentDay.clone();
            nextDay.add(1, 'days');
            nextDay.hour(hoursOfOpStartArr[0]);
            nextDay.minute(hoursOfOpStartArr[1]);
            nextDay.second(0).millisecond(0);
            unixNext = nextDay.unix();

            return (unixCurrent < unixTime) ? unixNext : unixCurrent;
        }

        // Helper function to get end of current day
        function getEndTime(unixTime) {
            let currentDay = moment.unix(unixTime).tz(localTZ);
            currentDay.hour(hoursOfOpEndArr[0]);
            currentDay.minute(hoursOfOpEndArr[1]);
            currentDay.second(0).millisecond(0);
            return currentDay.unix();
        }

        // Create free intervals
        const freeIntervals = [];
        let currentTime = getUnix(startTime);
        let i = 0;

        while (i < busyIntervals.length - 1) {
            // TEST CODE
            // console.log(local(currentTime).toISOString(true));
            // console.log(busyIntervals[i].map(x => local(getUnix(x)).toISOString(true)));
            // console.log();

            // If current time is outside hours of operation, fast-forward
            if (!inHoursOfOp(currentTime)) {
                currentTime = getStartTime(currentTime);
            } else if (inInterval(currentTime, busyIntervals[i])) {
                // If current time is in a busy interval, go to next iteration
                currentTime = getUnix(busyIntervals[i][END]);
                i++;
            } else {
                // Create free interval
                busyStart = getUnix(busyIntervals[i][START]);
                busyEnd = getUnix(busyIntervals[i][END]);

                /*
                 * If the start of the current busy interval is behind the current time, 
                 * then we skip over the current busy interval.
                 */
                if (busyStart > currentTime) {
                    endTime = getEndTime(currentTime);

                    endOfInterval = Math.min(busyStart, endTime);
                    /* 
                     * If we are going to the end of the day rather than the start of the
                     * current busy interval, then we do NOT want to advance.
                     */
                    if (endOfInterval == endTime) {
                        i--;
                    }

                    interval = [currentTime, endOfInterval];
                    freeIntervals.push(interval);

                    /* 
                     * We skip to either the end of the current busy interval or the end
                     * of the day, whichever comes first.
                     * This works because if endOfInterval == endTime, that means that
                     * endTime < busyStart < busyEnd.
                     */
                    currentTime = Math.min(busyEnd, endTime);
                }

                i++;
            }
        }

        return freeIntervals;
    }

    /**
     * Summary. Fits the given tasks into the user's free intervals.
     * 
     * Description. Sets the scheduled_time field of the given task objects. If a task cannot be scheduled,
     * then its scheduled_time field is set to null.
     * 
     * @see ScheduleService.getFreeIntervals()
     * 
     * @param {Array}   tasks               An array of task objects, sorted from earliest to latest due date.
     * @param {*}       startTime           Earliest time a free interval can start.
     * @param {string}  localTZ             The user's local timezone.
     * @param {Array}   hoursOfOpStart      Beginning of hours of operation.
     * @param {Array}   hoursOfOpEnd        End of hours of operation.       
     * @param {Array}   busyIntervals       An array of busyInterval arrays. 
     * 
     * @returns {Array} An array of task objects, in the original order, but with set scheduled times.
     */
    const scheduleTasks = async (tasks, startTime, localTZ, hoursOfOpStart, hoursOfOpEnd, busyIntervals) => {

        // Helper function to check that a task ends before the end of current interval
        function isValid(task) {
            const due = getUnix(task.due_date);
            const duration = task.duration * SECONDS_PER_MINUTE;
            const scheduledTime = task.scheduled_time;

            return (scheduledTime + duration <= due);
        }

        // Function to recursively schedule tasks
        function solve(tasks, freeIntervals) {
            if (tasks.length == 0) {
                return tasks;
            }

            const allBranches = [];
            const START = 0;
            const END = 1;

            let currentTask = tasks[0];
            const taskDuration = currentTask.duration * SECONDS_PER_MINUTE;

            for (let i = 0; i < freeIntervals.length; i++) {
                let interval = freeIntervals[i];
                let iDuration = interval[END] - interval[START];
                let currentTaskCopy = _.cloneDeep(currentTask);

                if (taskDuration <= iDuration) {
                    // Set task scheduled time to beginning of interval
                    currentTaskCopy.scheduled_time = interval[START];

                    // Check that the current task would complete before end of interval
                    if (!isValid(currentTaskCopy)) {
                        // Unable to schedule for any of the remaining intervals
                        break;
                    }

                    // Remove/update the scheduled interval from free intervals
                    let newFreeIntervals = freeIntervals.slice();

                    if (taskDuration < iDuration) {
                        // Create new free intervals array with new interval
                        let newInterval = [interval[START] + taskDuration, interval[END]];

                        newFreeIntervals = freeIntervals.slice(0, i)
                            .concat([newInterval])
                            .concat(freeIntervals.slice(i + 1));
                    } else if (taskDuration == iDuration) {
                        newFreeIntervals = freeIntervals.slice();
                        newFreeIntervals.splice(i, 1);
                    }

                    let restTasks = tasks.slice(1);
                    let result = solve(restTasks, newFreeIntervals);
                    let solution = [currentTaskCopy].concat(result);
                    allBranches.push(solution);
                }
            }

            if (allBranches.length == 0) {
                // It's impossible to schedule this task, so let all other tasks try
                currentTask.scheduled_time = null;
                let restTasks = tasks.slice(1);
                return [currentTask].concat(solve(restTasks, freeIntervals));
            }

            // Go through all branches and find max number of tasks scheduled
            let maxCount = 0;
            console.log('\nTask: ' + currentTask.id);
            // console.log('Branches: ');
            for (branch of allBranches) {
                let count = 0;
                // console.log(branch);
                for (task of branch) {
                    if (task.scheduled_time != null) {
                        count++;
                    }
                }
                maxCount = count > maxCount ? count : maxCount;
            }

            // Choose solution with max number
            for (branch of allBranches) {
                let count = 0;
                for (task of branch) {
                    if (task.scheduled_time != null) {
                        count++;
                    }
                }

                if (count == maxCount) {
                    // console.log('\nTask: ' + currentTask.id);
                    // console.log('Returning');
                    // console.log(branch);
                    return branch;
                }
            }
        }

        const freeIntervals = await getFreeIntervals(startTime, localTZ, hoursOfOpStart, hoursOfOpEnd, busyIntervals);
        const result = solve(tasks, freeIntervals);
        for (let i = 0; i < result.length; i++) {
            if (result[i].scheduled_time != null) {
                result[i].scheduled_time = moment.unix(result[i].scheduled_time).toISOString();
            }
        }

        return result;
    }

    return {
        getFreeIntervals, // returned only for debugging purposes!
        scheduleTasks,
    }
}


module.exports = {
    ScheduleService
}