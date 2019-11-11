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
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    );`;

  // Uses createUserTableSQL to create the table, and logs the error.
  const setupRepo = async () => {
    try {
      const client = await postgres.connect();
      // Uncomment this to delete and re-define the users table
      // await client.query('DROP TABLE users;');
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

  return {
    setupRepo,
    createUser,
    getUserIDByGoogleID,
    getUser,
  };
};

module.exports = {
  UserRepo,
};
