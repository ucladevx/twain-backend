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
        } catch (err) {
            return [null, err]; // return null for the actual object, the error should not be null
        } 
    }

    const getAllScheduledTasksSQL = `
        SELECT * FROM tasks WHERE user_id=$1 AND scheduled=TRUE ORDER BY start_time;
    `;
    const getAllScheduledTasks = async (userID) => {
        const values = [userID];
        try{
            const client = await postgres.connect();
            const res = await client.query(getAllScheduledTasksSQL, values);
            client.release();
            return [res.rows, null] // error message is empty string
        }
        catch (err) {
            return [null, "Error at Scheduled"]; // return null  for the data if user's tasks DNE
        }
    }
    const getAllNotScheduledTasksSQL = `
        SELECT * FROM tasks WHERE user_id=$1 AND scheduled = FALSE ORDER BY updated_time DESC;
    `;
    const getAllNotScheduledTasks = async (userID) => {
        const values = [userID];
        try{
            const client = await postgres.connect();
            const res = await client.query(getAllNotScheduledTasksSQL, values);
            client.release();
            return [res.rows, null] // error message is empty string 
        }
        catch (err) {
            return [null, "Error at Not Scheduled"]; // return null  for the data if user's tasks DNE
        }
    }

    const scheduleTaskSQL = `
        UPDATE tasks SET scheduled=true, event_id=$2, calendar_id=$3, start_time=$4, end_time=$5
        WHERE id=$1
        RETURNING *;
    `

    const scheduleTask = async(task_id, event_id, calendar_id, start_time, end_time) => {
        const values = [task_id, event_id, calendar_id, start_time, end_time];
        try {
            const client = await postgres.connect(); 
            const res = await client.query(scheduleTaskSQL, values);
            client.release();
            return [res.rows[0], ""];
        } catch (err) {
            return [null, err];
        }
    }

    return {
        setupRepo,
        createTask,
        getTaskByID,
        setTaskCompleted,
        getAllNotScheduledTasks,
        getAllScheduledTasks,
        scheduleTask,
    };
}

module.exports = {
    TaskRepo
}
