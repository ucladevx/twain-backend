const TaskRepo = (postgres) => {
    const createTaskTableSQL = `
        CREATE TABLE IF NOT EXISTS tasks(
            id SERIAL PRIMARY KEY,
            user_id text NOT NULL,
            name text NOT NULL,
            description text, 
            duration int NOT NULL,
            due_date timestamptz NOT NULL,
            completed boolean,
            completed_time timestamp, 
            scheduled boolean,
            scheduled_time timestamp,
            calendar_id text,
            event_id text,
            start_time timestamp,
            end_time timestamp,
            created_time timestamp DEFAULT NOW(),
            updated_time timestamp DEFAULT NOW()
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
        INSERT INTO tasks(name, description, duration, due_date, scheduled, completed, user_id)
        VALUES ($1, $2, $3, $4, FALSE, FALSE, $5)
        RETURNING *;
    `;

    const createTask = async (name, description, duration, due_date, user_id) => {
        const values = [name, description, duration, due_date, user_id];
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
        UPDATE tasks SET completed=true, completed_time=CURRENT_TIMESTAMP, updated_time=CURRENT_TIMESTAMP
        WHERE id=$1
        RETURNING *;
    `
    const setTaskCompleted = async (taskID) => {
        const values = [taskID];
        try {
            const client = await postgres.connect(); //client is an object that has a connection to DB 
            const res = await client.query(setTaskCompleteSQL, values);
            client.release();
            if (res.rows[0] == undefined)
                return [null, "Invalid ID"];
            return [res.rows[0], ""]; //requires null because no error in this case
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