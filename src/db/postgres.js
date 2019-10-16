const {Pool} = require('pg');

// Instantiates a new postgres connection pool, and returns the pool as a
// Postgres object, allowing the other parts of our application to access
// postgres, such as storing and retrieving data.
const PostgresDB = (config) => {
  const pool = new Pool(config);
  pool.on('error', (err, client) => {
    console.error('Unexpected error occured on idle client', err);
  });
  return pool;
};

module.exports = {
  PostgresDB,
};
