const express = require('express');
const EventController = (eventModel) => {
    const router = express.Router();

    // /event/:id GET
    /* 
    Parameters:
        id - Supplied in the URL. Used to indicate the event you are requesting.
    Returns:
        Success - 200 Status Code
        {
            "data": {
                "name": string
            }
        } 
        Error - 400 Status Code
        {
            "message": string
        }
    */
    router.get('/:id', async (req, res) => {
        const params = req.params;
        const id = parseInt(params.id, 10);
        const [event, err] = await eventModel.getEvent(id);
        if (err) {
            return res.status(400).json({
                message: err.message
            });
        }
        return res.status(200).json({
            data: {
                "name": event.name
            }
        });
    });

    // /event POST
    /* 
    Parameters:
        {
            "name": string
        }
    Returns:
        Success - 200 Status Code
        {
            "data": {
                "id": int
            }
        }
        Error - 400 Status Code
        {
            "message": string
        }
    */
    router.post('/', async (req, res) => {
        if (!req.body)
            return res.status(400).json({
                message: "Malformed Request"
            });
        const body = req.body;
        const name = body.name;
        const [data, err] = await eventModel.createEvent(name);
        if (err) {
            return res.status(400).json({
                message: err.message
            });
        }
        return res.status(200).json({
            data: {
                id: data.id
            }
        })
    })

    return router;
}

module.exports = {
    EventController
};