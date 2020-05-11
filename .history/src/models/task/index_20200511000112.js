const TaskModel = (repo) => {
    // Creates a task object with the specified fields
    const createTask = async (name, description, duration, due_date, user_id) => {
        return repo.createTask(name, description, duration, due_date, user_id);
    };

    // Gets a task object by ID
    const getTask = async (id, userID) => {
        const [task, err] = await repo.getTaskByID(id, userID);
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
    const scheduleTask = async (taskID, scheduledTime) => {
        const [task, err] = await repo.scheduleTask(taskID, scheduledTime);
        return [task, err];
    };
    const confirmSchedule = async (taskID, eventID, calendarID, eventURL, startTime, endTime) => {
        const [task, err] = await repo.confirmSchedule(taskID, eventID, calendarID, eventURL, startTime, endTime);
        return [task, err];
    };
    const deleteTask = async (taskID) => {
        const [task, err] = await repo.deleteTask(taskID);
        return [task, err];
    };
    const editTask = async (name, description, duration, due_date, user_id) => {
        return repo.editTask(name, description, duration, due_date, user_id);
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
        deleteTask,
        editTask, // just added
    };
}

module.exports = {
    TaskModel
};