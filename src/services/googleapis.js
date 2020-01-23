const _ = require('lodash');
const axios = require('axios');

const GoogleAPIService = () => {
	
	const userInfoURL = 'https://www.googleapis.com/oauth2/v2/userinfo'
	const userCalendarsURL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
	const freeBusyURL = 'https://www.googleapis.com/calendar/v3/freeBusy';

	const getUserInfoWithToken = async (token) => {
		var axiosInstance = axios.create({
  			baseURL: userInfoURL,
  			timeout: 1000,
  			headers: {'Authorization': 'Bearer ' + token}
		});

		return await axiosInstance.get('/')
			.then(response => {
			return [response.data, null]
			})
			.catch(error => {
			return [null, error]
			});

	};

	const getUserCalendarsWithToken = async (header) => {
		const auth_header = header['authorization']
		if (auth_header == null) {
			return [null, "No Authorization Received"]
		}
		const token = auth_header.slice(7)

		var axiosInstance = axios.create({
			baseURL: userCalendarsURL,
			timeout: 1000,
			headers: {'Authorization': auth_header}
		});

		return await axiosInstance.get('/')
			.then(response => {
				return [response.data, null]
			})
			.catch(error => {
				return [null, error]
			});
	}

	const getFreeBusyIntervalsWithToken = async (header, body) => {
		const auth_header = header['authorization']
		if (auth_header == null) {
			return [null, "No Authorization Received"]
		}
		const timeMin = body.timeMin;
		const timeMax = body.timeMax;
		const items = body.freebusy_list;

		axios.post(freeBusyURL,
			{
				timeMin: timeMin,
				timeMax: timeMax,
				items: items
			},
			{
				headers: {
					Authorization: auth_header
				}
			})
			.then((response) => {
				return [(response.data, null)];
			})
			.catch((error) => {
				return [null, error];
			});

		// var axiosInstance = axios.create({
		// 	baseURL: freeBusyURL,
		// 	timeout: 1000,
		// 	headers: {'Authorization': auth_header},
		// 	data: {
		// 		"timeMin": timeMin,
		// 		"timeMax": timeMax,
		// 		"items": items
		// 	}
		// });

		// return await axiosInstance.post('/')
		// 	.then((response) => {
		// 		return [(response.data, null)];
		// 	})
		// 	.catch((error) => {
		// 		return [null, error];
		// 	});
		// }

	return {
		getUserInfoWithToken,
		getUserCalendarsWithToken,
		getFreeBusyIntervalsWithToken
  };
}

module.exports = {
	GoogleAPIService,
};