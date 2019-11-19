const TaskModel = (repo) => {
    // Creates a task object with the specified fields
    const createTask = async (name, description, duration, user_id) => {
        return repo.createTask(name, description, duration, user_id);
    };

    // Gets a task object by ID
    const getTask = async (id, user_id) => {
        const [task, err] = await repo.getTaskByID(id, user_id);
        return [task, err];
    };

    return {
        createTask,
        getTask
    };
}

module.exports = {
    TaskModel
};