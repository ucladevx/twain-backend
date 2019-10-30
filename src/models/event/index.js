const EventModel = (repo) => {
    const createEvent = async (name) => {
        return repo.createEvent(name);
    };

    const getEvent = async (id) => {
        const [event, err] = await repo.getEventByID(id);
        return [event.name, err];
    };

    return {
        createEvent,
        getEvent
    };
}

module.exports = {
    EventModel
};