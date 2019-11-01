const EventModel = (repo) => {
    const createEvent = async (name, desc, duration) => {
        return repo.createEvent(name, desc, duration);
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