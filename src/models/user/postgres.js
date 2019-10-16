// Wrapper around postgres data functions for the User Model. Requires a
// postgres connection and ability to make valid postgres queries.
const UserRepo = (postgres) => {
  // Creates a table called "users" in the postgres database, with the fields
  // name, email, passhash, description, created_at, updated_at. However if the
  // table already exists, it will not recreate the table
  const createUserTableSQL = `
    CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      name text,
      email text NOT NULL UNIQUE,
      passhash text NOT NULL,
      description text,
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
    INSERT INTO users(name, email, passhash, description)
    VALUES($1, $2, $3, $4)
    RETURNING id, created_at;`;

  // Users createUserSQL and inserts a user into the users column. If we get an
  // error, then we return the (null, error), otherwise return (data, null)
  const createUser = async (name, email, passhash, description) => {
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
  const getUserByIDSQL = `
    SELECT id, name, email, passhash, description, created_at, updated_at FROM users WHERE id=$1;`;

  // Uses getUserByIDSQL to retrieve the user, and return either (user, null),
  // or (null, error)
  const getUserByID = async (id) => {
    const values = [id];
    try {
      const client = await postgres.connect();
      const res = await client.query(getUserByIDSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch (err) {
      return [null, err];
    }
  };

  const getUserByEmailSQL = `
    SELECT id, name, email, passhash, description, created_at, updated_at FROM users WHERE email=$1;`;

  const getUserByEmail = async (email) => {
    const values = [email];
    try {
      const client = await postgres.connect();
      const res = await client.query(getUserByEmailSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch (err) {
      return [null, err];
    }
  };

  const updateUserSQL = `
    UPDATE users
    SET name=$2, description=$3, updated_at=NOW()
    WHERE id=$1
    RETURNING updated_at;`;

  const updateUser = async (id, name, description) => {
    const values = [id, name, description];
    try {
      const client = await postgres.connect();
      const res = await client.query(updateUserSQL, values);
      client.release();
      return [res.rows[0], null];
    } catch (err) {
      return [null, err];
    }
  };

  // SQL query to delete user by their id
  const deleteUserSQL = `
    DELETE FROM users WHERE id=$1;`;

  // Deletes the user, and either returns an error if something went wrong, or
  // null
  const deleteUser = async (id) => {
    const values = [id];
    try {
      const client = await postgres.connect();
      await client.query(deleteUserSQL, values);
      client.release();
      return null;
    } catch (err) {
      return err;
    }
  };

  return {
    setupRepo,
    createUser,
    getUserByID,
    getUserByEmail,
    updateUser,
    deleteUser,
  };
};

module.exports = {
  UserRepo,
};
