const EventRepo = (postgres) => {
    const createEventTableSQL = `
        CREATE TABLE IF NOT EXISTS events(
            id SERIAL PRIMARY KEY,
            name text
        );
    `;

    const setupRepo = async () => {
        try {
            const client = await postgres.connect();
            await client.query(createEventTableSQL);
            client.release();
            console.log('Event Table Created');
            return null;
        }
        catch (err) {
            return err;
        }
    }

    const createEventSQL = `
        INSERT INTO events(name)
        VALUES ($1)
        RETURNING id, created_at;
    `;

    const createEvent = async (name) => {
        const values = [name];
        try {
            const client = await postgres.connect();
            const res = await client.query(createEventSQL, values);
            client.release();
            return [res.rows[0], null];
        }
        catch (err) {
            return [null, err];
        }
    };

    const getEventByIDSQL = `
        SELECT * FROM events WHERE id=$1;
    `;

    const getEventByID = async (id) => {
        const values = [id];
        try {
            const client = await postgres.connect();
            const res = await client.query(getEventByIDSQL, values);
            client.release();
            return [res.rows[0], null];
        }
        catch (err) {
            return [null, err];
        }
    };

    return {
        setupRepo,
        createEvent,
        getEventByID
    };
}

module.exports = {
    EventRepo
}