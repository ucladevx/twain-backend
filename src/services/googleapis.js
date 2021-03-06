const _ = require('lodash');
const axios = require('axios');

const GoogleAPIService = () => {
  const userInfoURL = 'https://www.googleapis.com/oauth2/v2/userinfo';
  const userCalendarsURL =
    'https://www.googleapis.com/calendar/v3/users/me/calendarList';
  const freeBusyURL = 'https://www.googleapis.com/calendar/v3/freeBusy';
  const eventHandlerURL = 'https://www.googleapis.com/calendar/v3/calendars/';

  const getUserInfoWithToken = async (token) => {
    let axiosInstance = axios.create({
      baseURL: userInfoURL,
      timeout: 1000,
      headers: {Authorization: 'Bearer ' + token},
    });

    return await axiosInstance
      .get('/')
      .then((response) => {
        return [response.data, null];
      })
      .catch((error) => {
        return [null, error];
      });
  };

  const getUserCalendarsWithToken = async (header) => {
    const auth_header = header['authorization'];
    if (auth_header == null) {
      return [null, 'No Authorization Received'];
    }

    let axiosInstance = axios.create({
      baseURL: userCalendarsURL,
      timeout: 1000,
      headers: {Authorization: auth_header},
    });

    return await axiosInstance
      .get('/')
      .then((response) => {
        return [response.data, null];
      })
      .catch((error) => {
        return [null, error];
      });
  };

  const getFreeBusyIntervalsWithToken = async (header, body) => {
    const auth_header = header['authorization'];
    if (auth_header == null) {
      return [null, 'No Authorization Received'];
    }

    let axiosInstance = axios.create({
      baseURL: freeBusyURL,
      timeout: 1000,
      headers: {Authorization: auth_header},
    });

    return await axiosInstance
      .post('/', body)
      .then((response) => {
        const calendars = response.data.calendars;
        const busyIntervals = [];

        for (let id of Object.keys(calendars)) {
          arr = calendars[id].busy;
          if (arr.length > 0) {
            arr.forEach((elem) => {
              busyIntervals.push([elem.start, elem.end]);
            });
          }
        }

        return [busyIntervals, null];
      })
      .catch((error) => {
        return [null, error];
      });
  };

  const scheduleEventWithToken = async (header, calendar_id, body) => {
    const auth_header = header['authorization'];
    if (auth_header == null) {
      return [null, 'No Authorization Received'];
    }

    let axiosInstance = axios.create({
      baseURL: eventHandlerURL + calendar_id + '/events',
      timeout: 1000,
      headers: {Authorization: auth_header},
    });

    return await axiosInstance
      .post('/', body)
      .then((response) => {
        return [response.data, null];
      })
      .catch((error) => {
        return [null, error];
      });
  };

  const deleteEventWithToken = async (header, calendar_id, event_id) => {
    const auth_header = header['authorization'];
    if (auth_header == null) {
      return [null, 'No Authorization Received'];
    }

    let axiosInstance = axios.create({
      baseURL: eventHandlerURL + calendar_id + '/events/' + event_id,
      timeout: 1000,
      headers: {Authorization: auth_header},
    });

    return await axiosInstance
      .delete('/', event_id)
      .then((response) => {
        return [response.data, null]; // Successful call should return an empty body
      })
      .catch((error) => {
        return [null, error];
      });
  };

  return {
    getUserInfoWithToken,
    getUserCalendarsWithToken,
    getFreeBusyIntervalsWithToken,
    scheduleEventWithToken,
    deleteEventWithToken,
  };
};

module.exports = {
  GoogleAPIService,
};
