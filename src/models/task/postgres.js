const TaskRepo = (postgres) => {
    const createTaskTableSQL = `
        CREATE TABLE IF NOT EXISTS tasks(
            id SERIAL PRIMARY KEY,
            name text NOT NULL,
            description text, 
            duration int NOT NULL, 
            scheduled boolean,
            completed boolean,
            user_id text NOT NULL,
            timeCompleted timestamptz
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
        INSERT INTO tasks(name, description, duration, scheduled, completed, user_id)
        VALUES ($1, $2, $3, FALSE, FALSE, $4)
        RETURNING *;
    `;

    const createTask = async (name, description, duration, user_id) => {
        const values = [name, description, duration, user_id];
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

    const setTaskCompleteSQL = `
        UPDATE tasks SET completed=true, timeCompleted=CURRENT_TIMESTAMP
        WHERE id=$1
        RETURNING *;
    `
    const setTaskCompleted = async (taskID) => {
        const values = [taskID];
        try {
            const client = await postgres.connect(); //client is an object that has a connection to DB 
            const res = await client.query(setTaskCompleteSQL, values);
            client.release();
            return [res.rows[0], null]; //requires null because no error in this case
        }
        catch (err) {
            return [null, err]; // return null for the actual object, the error should not be null
        } 
    }



    return {
        setupRepo,
        createTask,
        getTaskByID,
        setTaskCompleted
    };
}

module.exports = {
    TaskRepo
}