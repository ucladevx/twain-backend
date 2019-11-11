const _ = require('lodash');
const axios = require('axios');

const AuthService = (userModel) => {

	const TOKEN_VERIFY_URL = "https://oauth2.googleapis.com/tokeninfo?access_token="
	 

	// Pass in the 'headers' attribute of the request to get the user id of the user 
	// sending the request. Returns [user_id, error] where user_id is an int
	const getLoggedInUserID = async (header) => {
		const auth_header = header['authorization']
		const token = auth_header.slice(7)
		const url_str = TOKEN_VERIFY_URL.concat(token)
		
		const [google_id, error] = await axios.get(url_str)
		  .then(response => {
		  	const data = response.data
			const google_id = _.get(data, 'sub', '')
			if (google_id == '') {
				return [null, "Invalid Token"]
			}
			
			return [google_id, null]
		  })
		  .catch(error => {
			console.log(error);
			return [null, error]
		  });

		if (error) {
			return [null, error]
		}

		return await userModel.getUserIDByGoogleID(google_id)
	};

	return {
    	getLoggedInUserID
  };
}

module.exports = {
  AuthService,
};