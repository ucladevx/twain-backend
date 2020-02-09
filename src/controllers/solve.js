//  Arguments:
//      tasks - An array of task objects, as defined by the task model. Sorted from earliest
//          to latest due date.
//      freeTime - An array of two-element arrays, each representing an interval of free time.
//          The times should be in seconds since epoch.
function solve(tasks, freeTime) {
    if (tasks.length == 0)
        return tasks;

    // Get our first task
    let currTask = tasks[0] 
    const tDuration = currTask.duration;
    const tDueDate = Math.round(new Date(currTask.due_date).getTime() / 1000); // convert to seconds
    
    // Loop through the intervals, search for a free spot
    freeTime.forEach((interval) => {
        let iDuration = interval[1] - interval[0];

        if (tDuration <= iDuration) {
            // Set event start time to beginning of the interval (unix time)
            currTask.scheduled_time = interval[0];

            // Check that start_time + duration <= due_date
            if (currTask.scheduled_time + tDuration > tDueDate) {
                currTask.scheduled_time = -1;
                return [currTask].concat(solve(tasks.slice(1), freeTime));
            }

            // Update the interval
            if (tDuration <= iDuration) {
                newInterval = [interval[0] + tDuration, interval[1]];
                newFreeTime = [newInterval] + freeTime.slice(1);
            }
            else if (tDuration == iDuration) {
                newFreeTime = freeTime.slice(1);
            }

            // Recursively call solve for remaining tasks
            result = solve(tasks.slice(1), newFreeTime);

            if (typeof(result) == Object && result.length > 0)
                return [currTask].concat(result);
            else
                continue;
        }
    });  
    
    // Not solvable with any placement of the first event
    // Try to solve the rest
    return [currTask] + solve(tasks.slie(1), freeTime);
}