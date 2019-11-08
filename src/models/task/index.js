const TaskModel = (repo) => {
    // Creates a task object with the specified fields
    const createTask = async (name, description, duration) => {
        return repo.createTask(name, description, duration);
    };

    // Gets a task object by ID
    const getTask = async (id) => {
        const [task, err] = await repo.getTaskByID(id);
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