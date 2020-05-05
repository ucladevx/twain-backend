const moment = require('moment-timezone');

const ScheduleService = () => {
    /**
     * Summary. Gets intervals of free time between the given start and end time.
     * 
     * Description. N/A
     * 
     * @see services/googleapis.js/getFreeBusyIntervalsWithToken
     * 
     * @param {*}       startTime           Earliest time a free interval can start.
     * @param {string}  localTZ             The user's local timezone.
     * @param {Array}   hoursOfOpStart      Beginning of hours of operation.
     * @param {Array}   hoursOfOpEnd        End of hours of operation.       
     * @param {Array}   busyIntervals       An array of busyInterval arrays.
     * 
     * @return {Array} An array of free intervals in Unix time.
    */
    const getFreeIntervals = async(startTime, localTZ, hoursOfOpStart, hoursOfOpEnd, busyIntervals) => {        
        // Assuming that startTime is at or after the beginning of hours of operation but before
        // the end of hours of operation

        const START = 0;
        const END = 1;

        // Helper function to convert a time to its Unix timestamp
        function getUnix(time) {
            return moment(time).unix();
        }

        // Helper function to check if a time is within a given interval
        function inInterval(unixTime, interval) {
            return (
                unixTime >= getUnix(interval[START])
                && unixTime < getUnix(interval[END])
            )
        }

        // Helper function to check if a time is within hours of operation
        function inHoursOfOp(unixTime) {
            return (
                moment.unix(unixTime).tz(localTZ).hour() >= hoursOfOpStart
                && moment.unix(unixTime).tz(localTZ).hour() < hoursOfOpEnd
            )
        }

        // Helper function to get beginning of next day
        function getStartTime(unixTime) {
            let currentDay = moment.unix(unixTime).tz(localTZ);
            currentDay.hour(hoursOfOpStart).minute(0).second(0).millisecond(0);
            unixCurrent = currentDay.unix();

            let nextDay = currentDay.clone();
            nextDay.add(1, 'days');
            nextDay.hour(hoursOfOpStart).minute(0).second(0).millisecond(0);
            unixNext = nextDay.unix();

            return (unixCurrent < unixTime) ? unixNext : unixCurrent;
        }

        // Helper function to get end of current day
        function getEndTime(unixTime) {
            let currentDay = moment.unix(unixTime).tz(localTZ);
            currentDay.hour(hoursOfOpEnd).minute(0).second(0).millisecond(0);
            return currentDay.unix();
        }

        // Helper function for debugging by converting to local time
        function local(unixTime) {
            return moment.unix(unixTime).tz(localTZ).toISOString(true);
        }

        // Create free intervals
        const freeIntervals = [];
        let currentTime = getUnix(startTime);
        let i = 0;

        while (i < busyIntervals.length - 1) {
            console.log(local(currentTime));
            console.log(busyIntervals[i].map(x => local(getUnix(x))));
            console.log();

            // If current time is outside hours of operation, fast-forward
            if (!inHoursOfOp(currentTime)) {
                currentTime = getStartTime(currentTime);
            }
            // If current time is in a busy interval, go to next iteration
            else if (inInterval(currentTime, busyIntervals[i])) {                
                currentTime = getUnix(busyIntervals[i][END]);
                i++;
            }
            // Create free interval
            else {
                busyStart = getUnix(busyIntervals[i][START]);
                busyEnd = getUnix(busyIntervals[i][END]);

                // If the start of the current busy interval is behind the current time, 
                // then we skip over the current busy interval
                if (busyStart > currentTime) {                
                    endTime = getEndTime(currentTime);

                    endOfInterval = Math.min(busyStart, endTime);
                    // If we are going to the end of the day rather than the start of the
                    // current busy interval, then we do NOT want to advance
                    if (endOfInterval == endTime) { 
                        i--;
                    }

                    interval = [currentTime, endOfInterval];
                    freeIntervals.push(interval);

                    // We skip to either the end of the current busy interval or the end
                    // of the day, whichever comes first
                    // This works because if endOfInterval == endTime, that means that
                    // endTime < busyStart < busyEnd
                    currentTime = Math.min(busyEnd, endTime);
                }

                i++;
            }
        }
        
        return freeIntervals;
    }

    return {
        getFreeIntervals,
    }
}

module.exports = {
    ScheduleService
}