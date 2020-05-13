// Wrapper around postgres data functions for the User Model. Requires a
// postgres connection and ability to make valid postgres queries.
const UserRepo = (postgres) => {
  // Creates a table called "users" in the postgres database, with the fields
  // name, email, passhash, description, created_at, updated_at. However if the
  // table already exists, it will not recreate the table
  const createUserTableSQL = `
    CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      first_name text,
      last_name text,
      email text NOT NULL UNIQUE,
      google_id text,
      picture_url text,
      hours_start text,
      hours_end text,
      primary_calendar text,
      relevant_calendars text,
      weekend_setting boolean, 
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    );`;

  // Uses createUserTableSQL to create the table, and logs the error.
  const setupRepo = async () => {
    try {
      const client = await postgres.connect();
      await client.query(createUserTableSQL);
      client.release();
      console.log('User Table Created');
      return null;
    } catch (err) {
      return err;
    }
  };

  // Inserts a user entry into the users table
  const createUserSQL = `
    INSERT INTO users(first_name, last_name, email, google_id, picture_url)
    VALUES($1, $2, $3, $4, $5)
    RETURNING id, first_name, last_name, picture_url, created_at;`;

  // Users createUserSQL and inserts a user into the users column. If we get an
  // error, then we return the (null, error), otherwise return (data, null)
  const createUser = async (first_name, last_name, email, google_id, pic_url) => {
    const values = [first_name, last_name, email, google_id, pic_url];
    try {
      const client = await postgres.connect();
      const res = await client.query(createUserSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch (err) {
      return [null, err];
    }
  };

  // Retrieve the user id where the google ID is given
  const getUserIDByGoogleIDSQL = `
    SELECT id FROM users WHERE google_id=$1;`;

  // Uses getUserIDByGoogleIDSQL to retrieve the user, and return either (user, null),
  // or (null, error)
  const getUserIDByGoogleID = async (google_id) => {
    const values = [google_id];
    try {
      const client = await postgres.connect();
      const res = await client.query(getUserIDByGoogleIDSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch (err) {
      return [null, err];
    }
  };

  // Retrieve all user fields from the user column by a user's id. This should
  // only ever return one user, since IDs should be unique
  const getUserSQL = `
    SELECT * FROM users WHERE id=$1;`;

  // Uses getUserSQL to retrieve the user, and return either (user, null),
  // or (null, error)
  const getUser = async (id) => {
    const values = [id];
    try {
      const client = await postgres.connect();
      const res = await client.query(getUserSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch (err) {
      return [null, err];
    }
  };

  //Set the start-end hours to the hour range passed in and returns the updated values.
  const setHoursSQL = `
    UPDATE users
    SET hours_start=$1, hours_end=$2
    WHERE id=$3
    RETURNING *;`;

  const setHours = async (start_hour, end_hour, id) => {
    const values = [start_hour, end_hour, id];
    try {
      const client = await postgres.connect();
      const res = await client.query(setHoursSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch(err) {
      return [null, err];
    }
  };

  const setPrimaryCalendarSQL = `
    UPDATE users
    SET primary_calendar=$1
    WHERE id=$2
    RETURNING *;`;

  const setPrimaryCalendar = async (primary_calendar, id) => {
    const values = [primary_calendar, id];
    try {
      const client = await postgres.connect();
      const res = await client.query(setPrimaryCalendarSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch(err) {
      return [null, err];
    }
  };

  const setRelevantCalendarsSQL = `
    UPDATE users
    SET relevant_calendars=$1
    WHERE id=$2
    RETURNING *;`;

  const setRelevantCalendars = async (relevant_calendars, id) => {
    const values = [relevant_calendars, id];
    try {
      const client = await postgres.connect();
      const res = await client.query(setRelevantCalendarsSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch(err) {
      return [null, err];
    }
  };

  const setWeekendSQL = `
    UPDATE users
    SET weekend_setting = $1
    WHERE id=$2
    RETURNING *;`;

  const setWeekend = async (weekend_setting, id) => {
    const values = [weekend_setting, id];
    try {
      const client = await postgres.connect();
      const res = await client.query(setWeekendSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch(err) {
      return [null, err];
    }
  };

  return {
    setupRepo,
    createUser,
    getUserIDByGoogleID,
    getUser,
    setHours,
    setPrimaryCalendar,
    setRelevantCalendars,
    setWeekend,
  };
};

module.exports = {
  UserRepo,
};
