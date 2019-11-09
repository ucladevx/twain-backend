const _ = require('lodash');

const saltRounds = 12; // sets number of salt rounds for bcrypt, determining hashing strength

// User model exists as a wrapper in front of a database storage model. The
// API's here acts as a contract between the controllers and the database. If we
// needed to switch out our database, we would not have to change our
// controllers, we can change the minimal logic here and in our repository
// storage system. By default it is postgres, but notice that none of the code
// in the UserModel relies on any specific database. Thus we can pass in any
// database, and allow data to be stored anywhere.
//
// Additionally, we can place validation and check logic in the UserModel, to
// catch bad data before trying to put it into the data store.
const UserModel = (repo) => {
  // Creates a user with a given name, email, and google_id
  const createUser = async (first_name, last_name, email, google_id) => {
    return repo.createUser(first_name, last_name, email, google_id);
  };

  // Maps a Google ID (which we get from the access token) to our definition
  // of a user id, to use in other tables
  const getUserIDByGoogleID = async (id) => {
    const [user, err] = await repo.getUserIDByGoogleID(id);
    return [
      _.pick(user, ['id']),
      err,
    ];
  };

  return {
    createUser,
    getUserIDByGoogleID,
  };
};

module.exports = {
  UserModel,
};
