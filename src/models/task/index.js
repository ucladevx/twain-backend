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
    }

    return {
        createTask,
        getTask, 
        setTaskCompleted,
        getAllScheduledTasks,
        getAllNotScheduledTasks
    };
}

module.exports = {
    TaskModel
};