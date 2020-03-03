const TaskModel = (repo) => {
    // Creates a task object with the specified fields
    const createTask = async (name, description, duration, due_date, user_id) => {
        return repo.createTask(name, description, duration, due_date, user_id);
    };

    // Gets a task object by ID
    const getTask = async (id, user_id) => {
        const [task, err] = await repo.getTaskByID(id, user_id);
        return [task, err];
    };

    const setTaskCompleted = async (taskID) => {
        const [task, err] = await repo.setTaskCompleted(taskID);
        return [task, err];
    };

    const getAllScheduledTasks = async (userID) => {
        const [task, err] = await repo.getAllScheduledTasks(userID);
        return [task, err];
    };
    const getAllNotScheduledTasks = async (userID) => {
        const [task, err] = await repo.getAllNotScheduledTasks(userID);
        return [task, err];
    };
    const getTasksForScheduling = async (userID, taskIDs) => {
        const [tasks, err] = await repo.getTasksForScheduling(userID, taskIDs);
        return [tasks, err];
    };
    const scheduleTask = async(task_id, scheduled_time) => {
        const [task, err] = await repo.scheduleTask(task_id, scheduled_time);
        return [task, err];
    };   
    const confirmSchedule = async (task_id, event_id, calendar_id, start_time, end_time) => {
        const [task, err] = await repo.confirmSchedule(task_id, event_id, calendar_id, start_time, end_time);
        return [task, err];
    };
    const cancelSchedule = async (task_id) => {
        const [task, err] = await repo.cancelSchedule(task_id);
        return [task, err];
    };

    return {
        createTask,
        getTask, 
        setTaskCompleted,
        getAllScheduledTasks,
        getAllNotScheduledTasks,
        getTasksForScheduling,
        scheduleTask,
        confirmSchedule,
        cancelSchedule
    };
}

module.exports = {
    TaskModel
};