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
        data: null,
        message: err1.message
      });
    } else if (user_id_from_request != id) {
      // Make sure the requestor has access to this object, if not, Access Denied
      return res.status(403).json({
        data: null,
        message: "Access Denied"
      });
    }

    const [user, err2] = await userModel.getUser(id);
    if (err2) {
      return res.status(400).json({
        data: null,
        message: err.message
      });
    }
    return res.status(200).json({
      data: user,
      message: ""
    });
  });


  router.post('/signup', async (req, res) => {
    if (!req.body) return res.status(400).json({
      data: null,
      message: "Malformed Request"
    });
    body = req.body

    const token = body.token;
    const [data, err1] = await googleAPIService.getUserInfoWithToken(token);

    if (err1) {
      return res.status(400).json({
        data: null,
        message: err1.message
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
      message: "",
    });
  });

  router.post('/hours', async (req, res)=>{
    if (!req.headers) return res.status(400).json({
        data: null,
        message: "Malformed Request"
    });

    if (!req.body) return res.status(400).json({
      data: null,
      message: "Malformed Request",
    });
    body = req.body;

    const start_hour = body.start;
    const end_hour = body.end;
    //check if start/end hours are out of range or undefined
    if(start_hour === undefined || start_hour < 0 || start_hour > 24 || end_hour === undefined || end_hour < 0 || end_hour > 24){
      return res.status(400).json({
        data:null,
        message:"Malformed Request"
      });
    }

    const [id, err1] = await authService.getLoggedInUserID(req.headers);

    if(id === undefined){
      return res.status(400).json({
        data:null,
        message:"Malformed Request: "+err1,
      });
    }

    const [hrs_set, err2] = await userModel.setHours(start_hour, end_hour, id);

    if(err2){
      return res.status(400).json({
        data:null,
        message:err2.message,
      });
    }

    return res.status(200).json({
      data: hrs_set,
      message: '',
    });
  });

  return router;

}
  
module.exports = {
  UserController,
};

