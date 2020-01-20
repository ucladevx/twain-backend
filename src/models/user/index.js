const _ = require('lodash');

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
  const createUser = async (first_name, last_name, email, google_id, picture_url) => {
    return repo.createUser(first_name, last_name, email, google_id, picture_url);
  };

  // Maps a Google ID (which we get from the access token) to our definition
  // of a user id, to use in other tables
  const getUserIDByGoogleID = async (id) => {
    const [user, err] = await repo.getUserIDByGoogleID(id);
    return [
      _.get(user, ['id']),
      err,
    ];
  };

  const getUser = async (id) => {
    return await repo.getUser(id);
  };

  const setHours = async(start_hour, end_hour, id) => {
    return await repo.setHours(start_hour, end_hour, id);
  }

  return {
    createUser,
    getUserIDByGoogleID,
    getUser,
    setHours,
  };
};

module.exports = {
  UserModel,
};
