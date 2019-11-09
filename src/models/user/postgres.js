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
    INSERT INTO users(first_name, last_name, email, google_id)
    VALUES($1, $2, $3, $4)
    RETURNING id, created_at;`;

  // Users createUserSQL and inserts a user into the users column. If we get an
  // error, then we return the (null, error), otherwise return (data, null)
  const createUser = async (first_name, last_name, email, google_id) => {
    const values = [name, email, passhash, description];
    try {
      const client = await postgres.connect();
      const res = await client.query(createUserSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch (err) {
      return [null, err];
    }
  };

  // Retrieve all user fields from the user column by a user's id. This should
  // only ever return one user, since IDs should be unique
  const getUserIDByGoogleIDSQL = `
    SELECT id FROM users WHERE google_id=$1;`;

  // Uses getUserIDByGoogleID to retrieve the user, and return either (user, null),
  // or (null, error)
  const getUserIDByGoogleID = async (google_id) => {
    const values = [google_id];
    try {
      const client = await postgres.connect();
      const res = await client.query(getUserIDByGoogleID, values);
      client.release();
      return [res.rows[0], null];
    } catch (err) {
      return [null, err];
    }
  };

  return {
    setupRepo,
    createUser,
    getUserIDByGoogleID,
  };
};

module.exports = {
  UserRepo,
};
