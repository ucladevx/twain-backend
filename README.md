# twain-backend
The backend for the Twain scheduling app

## Makefile commands

* **make**: Runs **make build** and **make run**
* **make build**: Builds the docker container
* **make run**: Runs the server and postgres 
* **make run_background**: Runs the server and postgres in the background (i.e. you will see no output)
* **make stop**: If you run **make run_background**, use this to stop the server
* **make p_shell**: Opens an interactive psql shell connected to our postgres instance
* **make reset_db**: **CAUTION** THIS WILL DELETE ALL DATA IN THE DB. Use when you change schemas and you are ok losing data. Tables will be recreated on the next re-start of server.

**Note**: Both **make p_shell** and **make reset_db** can only be run while the server is running

## How to do authorized requests
Use the `access_token` from Chrome to do requests
  - Add `Authorization: Bearer <ACCESS_TOKEN>` to the header of the request


## API Definitions
### Create new user
POST /api/users/signup (*No access token in header needed for this request*)
```
    {
        "token": "<ACCESS_TOKEN_FROM_CHROME"
    }
```
returns 
  ```
    {
      "data": {
  	  	"id": <TWAIN_USER_ID>,
    		"first_name": "<user_first_name>",
    		"last_name": "<user_last_name>",
    		"picture_url": "<profile_picture_url_from_google",
    		"created_at": <CREATED_AT_TIMESTAMP>
      },
      "error": "<ERROR_MESSAGE>",
    }
```