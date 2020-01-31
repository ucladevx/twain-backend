const express = require('express');

const UserCalendarController = (userModel, authService, googleAPIService) => {
  const router = express.Router();

  router.post('/primary', async (req, res)=>{
    if (!req.headers) return res.status(400).json({
        data: null,
        message: "Malformed Request"
    });

    if (!req.body) return res.status(400).json({
      data: null,
      message: "Malformed Request",
    });
    body = req.body;

    const primary_calendar = body.primary_calendar;

    const [id, err1] = await authService.getLoggedInUserID(req.headers);

    if(id === undefined){
      return res.status(400).json({
        data:null,
        message:"Malformed Request: "+err1,
      });
    }

    const [user_data, err2] = await userModel.setPrimaryCalendar(primary_calendar, id);

    if(err2){
      return res.status(400).json({
        data:null,
        message:err2.message,
      });
    }

    return res.status(200).json({
      data: user_data,
      message: '',
    });
  });

  router.post('/relevant', async (req, res)=>{
    if (!req.headers) return res.status(400).json({
        data: null,
        message: "Malformed Request"
    });

    if (!req.body) return res.status(400).json({
      data: null,
      message: "Malformed Request",
    });
    body = req.body;

    const relevant_calendars = body.relevant_calendars;

    const [id, err1] = await authService.getLoggedInUserID(req.headers);

    if(id === undefined){
      return res.status(400).json({
        data:null,
        message:"Malformed Request: "+err1,
      });
    }

    const [user_data, err2] = await userModel.setRelevantCalendars(relevant_calendars, id);

    if(err2){
      return res.status(400).json({
        data:null,
        message:err2.message,
      });
    }

    return res.status(200).json({
      data: user_data,
      message: '',
    });
  });


  return router;
}

module.exports = {
  UserCalendarController,
};
