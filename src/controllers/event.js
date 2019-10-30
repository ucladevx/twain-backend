const express = require('express');
const EventController = (eventModel) => {
    const router = express.Router();

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
            data: event
        });
    });

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