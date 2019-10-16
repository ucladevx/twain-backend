const bcrypt = require('bcrypt');
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
  // Creates a user with a given name, email, password, and profile description
  // and stores it into the repository. Before storing, however, we need to hash
  // their password, since storing plain passwords is bad practice (Never store
  // plain passwords anywhere).
  const createUser = async (name, email, password, description) => {
    // check if email is real email
    // regex check
    // return (null, ErrName)
    // check if user password length > 8 and has a number
    const passhash = await bcrypt.hash(password, saltRounds);
    return repo.createUser(name, email, passhash, description);
  };

  // Retrieves a user by it's id. However, our repository returns lots of
  // superfluous information, and potentially sensitive information such as
  // password hashes. We use lodash to pick which fields we want to send.
  const getUser = async (id) => {
    const [user, err] = await repo.getUserByID(id);
    return [
      _.pick(user, ['id', 'name', 'email', 'description', 'created_at']),
      err,
    ];
  };

  // No special modifications necessary, just pass the update request onto the
  // repository.
  const updateUser = async (id, name, description) => {
    return repo.updateUser(id, name, description);
  };

  // No special modifications necessary, just pass the delete request onto the
  // repository.
  const deleteUser = async (id) => {
    return repo.deleteUser(id);
  };

  // Verify that the password a user submitted to login is correct. We don't
  // compare the actual passwords, but instead hash the password with bcrypt,
  // and compare our stored hash with the submitted hash, and return if the
  // hashes match.
  const verifyPassword = async (email, password) => {
    const [user, err] = await repo.getUserByEmail(email);
    if (err) {
      return [null, false];
    }
    return [user.id, bcrypt.compare(password, user.passhash)];
  };

  return {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    verifyPassword,
  };
};

module.exports = {
  UserModel,
};
