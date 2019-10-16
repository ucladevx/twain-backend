const express = require('express');
const UserController = (userModel) => {
  const router = express.Router();

  // /user/:id GET
  // Requires id as a url parameter for input, used to select which user you are
  // requesting.
  // Returns the user object under the format:
  // {
  //    "data": {
  //      "id": Int
  //      "name": String
  //      "email": String
  //      "description": String
  //    }
  // }
  // If an error occured, then it will return a 400 status code, with the
  // appropriate message under
  // {
  //    "message": String
  // }
  // TODO check if user actually exists
  router.get('/:id', async (req, res) => {
    const params = req.params;
    const id = parseInt(params.id, 10);
    const [user, err] = await userModel.getUser(id);
    if (err) {
      return res.status(400).json({
        message: err.message,
      });
    }
    return res.status(200).json({
      data: user,
    });
  });

  // /user POST
  // Body: {
  //  name: String
  //  email: String
  //  password: String
  //  description: String
  // }
  //
  // Returns Status 200 on success with the id of the user, otherwise will
  // return the appropriate error code, with the data under the
  // {
  //  message: String
  // }
  // If the JSON body is malformed, it will return 400 BadRequest
  // If the error could not be determined, it returns a 500 InternalServerError

  router.post('/', async (req, res) => {
    if (!req.body) return res.status(400).json({
      "message": "Malformed Request",
    });
    const body = req.body;
    const name = body.name;
    const email = body.email;
    const password = body.password;
    const description = body.description;
    const [data, err] = await userModel.createUser(
      name,
      email,
      password,
      description,
    );
    if (err) {
      return res.status(400).json({
        message: err.message,
      });
    }
    return res.status(200).json({
      data: {
        id: data.id,
      },
    });
  });

  // /user/:id PUT
  // Body: {
  //  name: String
  //  description: String
  // }
  //
  // Returns status 204 no content on successful update, otherwise will return the
  // appropriate error code, with the error under the body
  // {
  //  message: String
  // }
  router.put('/:id', async (req, res) => {
    if (!req.body) return res.status(400);
    const params = req.params;
    const id = parseInt(params.id, 10);
    const body = req.body;
    const name = body.name;
    const description = body.description;
    const [data, err] = await userModel.updateUser(id, name, description);
    if (err) {
      return res.status(400).json({
        message: err.message,
      });
    }
    return res.status(204).send(); // sends no content
  });

  return router;
};

module.exports = {
  UserController,
};

