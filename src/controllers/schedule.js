const express = require('express');
const moment = require('moment');

const ScheduleController = (userModel, taskModel, authService, googleAPIService) => {
    const router = express.Router();

    router.post('/', async(req, res) => {
        if (!req.headers)
            return res.status(400).json({
                data: null,
                message: "Malformed Request"
            });
        
        const [user_id, user_err] = await authService.getLoggedInUserID(req.headers);
        if (user_id == null) {
            return res.status(400).json({
                data: null,
                eror: "Malformed Request " + user_err
            });
        }

        // Create freeBusy request body
        const [user, err] = await userModel.getUser(user_id);
        let startTime = new moment().date(10).hour(user.hours_start).minute(0).second(0).millisecond(0);
        startTime = startTime.toISOString();
        let endTime = new moment().date(10).hour(user.hours_end).minute(0).second(0).millisecond(0);
        endTime = endTime.toISOString();
        
        const relevantCalendars = user.relevant_calendars.split(',');
        const freeBusyItems = [];

        relevantCalendars.forEach((calendarID) => {
            freeBusyItems.push({"id": calendarID});
        });

        const freeBusyBody = {
            "timeMin": startTime,
            "timeMax": endTime,
            "items": freeBusyItems
        };

        let [intervals, intervals_err] = await googleAPIService.getFreeBusyIntervalsWithToken(req.headers, freeBusyBody);

        return res.status(200).json({
            data: intervals,
            error: intervals_err
        })
    });

    return router;
}

module.exports = {
    ScheduleController
};