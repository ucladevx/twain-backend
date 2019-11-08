const EventModel = (repo) => {
    // Creates an event object with the specified fields
    const createEvent = async (name) => {
        return repo.createEvent(name);
    };

    // Gets an event object by ID
    const getEvent = async (id) => {
        const [event, err] = await repo.getEventByID(id);
        return [event, err];
    };

    return {
        createEvent,
        getEvent
    };
}

module.exports = {
    EventModel
};