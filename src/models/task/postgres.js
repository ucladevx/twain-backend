const TaskRepo = (postgres) => {
    const createTaskTableSQL = `
        CREATE TABLE IF NOT EXISTS tasks(
            id SERIAL PRIMARY KEY,
            name text NOT NULL,
            description text, 
            duration int NOT NULL, 
            scheduled boolean,
            completed boolean
        );
    `;

    const setupRepo = async () => {
        try {
            const client = await postgres.connect();
            await client.query(createTaskTableSQL);
            client.release();
            console.log('Task Table Created');
            return null;
        }
        catch (err) {
            return err;
        }
    }

    const createTaskSQL = `
        INSERT INTO tasks(name, description, duration, scheduled, completed)
        VALUES ($1, $2, $3, FALSE, FALSE)
        RETURNING *;
    `;

    const createTask = async (name, description, duration) => {
        const values = [name, description, duration];
        try {
            const client = await postgres.connect();
            const res = await client.query(createTaskSQL, values);
            client.release();
            return [res.rows[0], null];
        }
        catch (err) {
            return [null, err];
        }
    };

    const getTaskByIDSQL = `
        SELECT * FROM tasks WHERE id=$1;
    `;

    const getTaskByID = async (id) => {
        const values = [id];
        try {
            const client = await postgres.connect();
            const res = await client.query(getTaskByIDSQL, values);
            client.release();
            return [res.rows[0], null];
        }
        catch (err) {
            return [null, err];
        }
    };

    return {
        setupRepo,
        createTask,
        getTaskByID
    };
}

module.exports = {
    TaskRepo
}