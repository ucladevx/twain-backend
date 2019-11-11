const _ = require('lodash');
const axios = require('axios');

const GoogleAPIService = () => {


	const setupRepo = () => {
		console.log("Alex setup repo")
	}
	
	const userInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"

	const getUserInfoWithToken = async (token) => {
		console.log("Alex in function")

		var axiosInstance = axios.create({
  			baseURL: "https://www.googleapis.com/oauth2/v2/userinfo",
  			timeout: 1000,
  			headers: {'Authorization': 'Bearer ' + token}
		});

		result = "alex"

		result = await axiosInstance.get('/')
		  .then(response => {
			
			return response.data
		  })
		  .catch(error => {
			console.log(error);
			return null
		  });

		return result

	};

	return {
    	setupRepo,
    	getUserInfoWithToken,
  };
}

module.exports = {
  GoogleAPIService,
};