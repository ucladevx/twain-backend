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

    return {
        createTask,
        getTask, 
        setTaskCompleted
    };
}

module.exports = {
    TaskModel
};