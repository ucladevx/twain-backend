const express = require('express');
const UserController = (userModel, authService, googleAPIService) => {
  const router = express.Router();

  router.get('/:id', async (req, res) => {
    const params = req.params;
    const id = parseInt(params.id, 10);

    // Get the user_id of the user sending the request
    const [user_id_from_request, err1] = await authService.getLoggedInUserID(req.headers);

    if (err1) {
      return res.status(400).json({
        message: err.message,
      });
    } else if (user_id_from_request != id) {
      // Make sure the requestor has access to this object, if not, Access Denied
      return res.status(403).json({
        message: "Access Denied"
      });
    }

    const [user, err2] = await userModel.getUser(id);
    if (err2) {
      return res.status(400).json({
        message: err.message,
      });
    }
    return res.status(200).json({
      data: user,
    });
  });


  router.post('/signup', async (req, res) => {
    if (!req.body) return res.status(400).json({
      "message": "Malformed Request",
    });
    body = req.body
    console.log(body)

    const token = body.token;
    const [data, err1] = await googleAPIService.getUserInfoWithToken(token);

    if (err1) {
      return res.status(400).json({
        data: null,
        message: err1.message,
      });
    }

    const first_name = data['given_name']
    const last_name = data['family_name']
    const email = data['email']
    const google_id = data['id']
    const pic_url = data['picture']
    
    const [user, err2] = await userModel.createUser(
      first_name,
      last_name,
      email,
      google_id,
      pic_url,
    );

    if (err2) {
      return res.status(400).json({
        data: null,
        message: err2.message,
      });
    }
    return res.status(200).json({
      data: user,
      message: '',
    });
  });

  return router;

}
  
module.exports = {
  UserController,
};

