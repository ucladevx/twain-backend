
const TaskModel = (repo) => {
    const createTask = async (name, description, duration) => {
        return repo.createTask(name, description, duration);
    };

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