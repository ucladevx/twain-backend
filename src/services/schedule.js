const moment = require('moment-timezone');
const _ = require('lodash');
const SECONDS_PER_MINUTE = 60;

const ScheduleService = () => {
  // Helper function to convert a time into its seconds since epoch equivalent
  function getUnix(time) {
    return moment(time).unix();
  }

  // Constants
  const START = 0;
  const END = 1;

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
   * @param {Boolean} weekendsEnabled     Whether or not we can schedule on the weekends.
   * @param {Array}   busyIntervals       An array of busyInterval arrays.
   *
   * @return {Array} An array of free intervals in Unix time.
   */
  const getFreeIntervals = async (
    startTime,
    localTZ,
    hoursOfOpStart,
    hoursOfOpEnd,
    weekendsEnabled,
    busyIntervals,
  ) => {
    /*
     * Assuming that startTime is at or after the beginning of hours of operation but before
     * the end of hours of operation.
     */

    // For when we allow the user more flexibility with start time:
    const hoursOfOpStartArr = hoursOfOpStart.split(':').map((x) => parseInt(x));
    const hoursOfOpEndArr = hoursOfOpEnd.split(':').map((x) => parseInt(x));

    // Helper function to check if a time is within a given interval
    function inInterval(unixTime, interval) {
      return (
        unixTime >= getUnix(interval[START]) &&
        unixTime < getUnix(interval[END])
      );
    }

    // Helper function for converting to moment object in local time
    function local(unixTime) {
      return moment.unix(unixTime).tz(localTZ);
    }

    // Helper function to check if a time is during the weekend
    function duringWeekend(unixTime) {
      const localTime = local(unixTime);
      return localTime.day() == 6 || localTime.day() == 0;
    }

    // Helper function to check if a time is within hours of operation
    function inHoursOfOp(unixTime) {
      const localTime = local(unixTime);

      if (!weekendsEnabled && duringWeekend(unixTime)) {
        return false;
      }

      const afterHoursStart =
        localTime.hour() >= hoursOfOpStartArr[0] &&
        localTime.minute() >= hoursOfOpStartArr[1];

      const beforeHoursEnd =
        localTime.hour() < hoursOfOpEndArr[0] ||
        (localTime.hour() == hoursOfOpEndArr[0] &&
          localTime.minute() < hoursOfOpEndArr[1]);

      return afterHoursStart && beforeHoursEnd;
    }

    /*
     *  Helper function to get beginning of next valid interval
     * In most cases, this just means the next day, but in the
     * case that the user doesn't allow scheduling on weekends,
     * this would mean the following Monday.
     */
    function getStartTime(unixTime) {
      let currentDay = moment.unix(unixTime).tz(localTZ);
      let nextDay = currentDay.clone();

      const isDuringWeekend = duringWeekend(unixTime);

      if (!weekendsEnabled && isDuringWeekend) {
        if (currentDay.day() == 6) {
          nextDay.add(2, 'days');
        } else if (currentDay.day() == 0) {
          nextDay.add(1, 'days');
        }

        nextDay.hour(hoursOfOpStartArr[0]);
        nextDay.minute(hoursOfOpStartArr[1]);
        nextDay.second(0).millisecond(0);
        unixNext = nextDay.unix();

        return unixNext;
      } else {
        currentDay.hour(hoursOfOpStartArr[0]);
        currentDay.minute(hoursOfOpStartArr[1]);
        currentDay.second(0).millisecond(0);
        unixCurrent = currentDay.unix();

        nextDay.add(1, 'days');
        nextDay.hour(hoursOfOpStartArr[0]);
        nextDay.minute(hoursOfOpStartArr[1]);
        nextDay.second(0).millisecond(0);
        unixNext = nextDay.unix();

        return unixCurrent < unixTime ? unixNext : unixCurrent;
      }
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

    while (i < busyIntervals.length) {
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
  };

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
   * @param {Boolean} weekendsEnabled     Whether or not we can schedule on the weekend.
   * @param {Array}   busyIntervals       An array of busyInterval arrays.
   *
   * @returns {Array} An array of task objects, in the original order, but with set scheduled times.
   */
  const scheduleTasks = async (
    tasks,
    startTime,
    localTZ,
    hoursOfOpStart,
    hoursOfOpEnd,
    weekendsEnabled,
    busyIntervals,
  ) => {
    // Helper function to check that a task ends before the end of current interval
    function isValid(task) {
      const due = getUnix(task.due_date);
      const duration = task.duration * SECONDS_PER_MINUTE;
      const scheduledTime = task.scheduled_time;

      return scheduledTime + duration <= due;
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

            newFreeIntervals = freeIntervals
              .slice(0, i)
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

      // Go through all branches and get scores
      let scores = [];
      let scheduledNumArr = [];

      console.log("On task id: " + currentTask.id)
      console.log("Branches:")

      let maxScheduledNum = -1;
      for (branch of allBranches) {
        console.log(branch)
        let score = 0;
        let numScheduled = 0;
        for (task of branch) {
          if (task.scheduled_time != null) {
            numScheduled += 1
            score +=
              (getUnix(task.due_date) - task.scheduled_time) / task.duration;
          }
        }
        console.log("Score")
        console.log(score)
        console.log("\n\n")
        scores.push(score);

        if (numScheduled > maxScheduledNum) {
            maxScheduledNum = numScheduled
        }

        scheduledNumArr.push(numScheduled)
      }

      let indexToReturn = -1;
      let highScore = -1;

      for (let i = 0; i < scheduledNumArr.length; i++) {
        if (scheduledNumArr[i] == maxScheduledNum) {
          if (scores[i] > highScore) {
            indexToReturn = i
            highScore = scores[i]
          }
        }
      }

      return allBranches[indexToReturn];
    }

    // Insert a busy interval at the last task due date
    const lastTask = tasks[tasks.length - 1];
    const lastTaskDue = lastTask.due_date;
    const endBusyInterval = [lastTaskDue, lastTaskDue];
    busyIntervals.push(endBusyInterval);

    // Sort the busy intervals in ascending order of start datetime
    busyIntervals.sort((a, b) => {
      if (moment(a[0]).isBefore(moment(b[0]))) return -1;
      else if (moment(a[0]).isAfter(moment(b[0]))) return 1;
      else return 0;
    });

    // Get free intervals
    const freeIntervals = await getFreeIntervals(
      startTime,
      localTZ,
      hoursOfOpStart,
      hoursOfOpEnd,
      weekendsEnabled,
      busyIntervals,
    );

    // Reset scheduled_time field
    tasks.map((task) => (task.scheduled_time = null));

    // Schedule tasks
    const result = solve(tasks, freeIntervals);

    // Sort the scheduled tasks in ascending order of scheduled time
    result.sort((a, b) => {
      if (a.scheduled_time == null && b.scheduled_time == null) return 0;
      else if (a.scheduled_time == null && b.scheduled_time != null) return 1;
      else if (a.scheduled_time != null && b.scheduled_time == null) return -1;
      if (moment.unix(a.scheduled_time).isBefore(moment.unix(b.scheduled_time)))
        return -1;
      else if (moment.unix(a.scheduled_time).isAfter(moment(b.scheduled_time)))
        return 1;
      else return 0;
    });

    // Translate into ISO Strings
    for (let i = 0; i < result.length; i++) {
      if (result[i].scheduled_time != null) {
        result[i].scheduled_time = moment
          .unix(result[i].scheduled_time)
          .toISOString();
      }
    }

    return result;
  };

  return {
    getFreeIntervals, // returned only for debugging purposes!
    scheduleTasks,
  };
};

module.exports = {
  ScheduleService,
};
