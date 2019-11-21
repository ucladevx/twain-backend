const _ = require('lodash');
const axios = require('axios');

const GoogleAPIService = () => {
	
	const userInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"

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

	return {
    	getUserInfoWithToken,
  };
}

module.exports = {
  GoogleAPIService,
};