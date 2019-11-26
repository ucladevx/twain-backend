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
  "token": "<ACCESS_TOKEN_FROM_CHROME>"
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

### Get user info by id
GET /api/users/{user_id}

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

### Create new task
POST /api/tasks/
```
{
  "name": "<task_name>"
  "description": "<task_description>",
  "duration": <task_duration_in_seconds>
}
```
returns
```
{
  "data": {
    "id": <task_id>,
    "user_id": <TWAIN_USER_ID>
    "name": "<task_name>",
    "description": "<task_description>",
    "duration": <task_duration_in_seconds>,
    "due_date": <timestamp>,
    "completed": <boolean>,
    "completed_time": <timestamp>,
    "scheduled": <boolean>,
    "scheduled_time": <timestamp>,
    "calendar_id" <google_calendar_id>,
    "event_id": <google_event_id>, 
    "start_time": <timestamp>,
    "end_time": <timestamp>,
    "created_time" <timestamp>,
    "updated_time" <timestamp>
  },
  "error": "<ERROR_MESSAGE>"
}
```

### Get task by ID
GET /api/tasks/{id}

returns
```
{
  "data": {
    "id": <task_id>,
    "user_id": <TWAIN_USER_ID>
    "name": "<task_name>",
    "description": "<task_description>",
    "duration": <task_duration_in_seconds>,
    "due_date": <timestamp>,
    "completed": <boolean>,
    "completed_time": <timestamp>,
    "scheduled": <boolean>,
    "scheduled_time": <timestamp>,
    "calendar_id" <google_calendar_id>,
    "event_id": <google_event_id>, 
    "start_time": <timestamp>,
    "end_time": <timestamp>,
    "created_time" <timestamp>,
    "updated_time" <timestamp>
  },
  "error": "<ERROR_MESSAGE>"
}
```

### Get all tasks for a user
GET /api/tasks/me

returns
```
{
  "data": {
    "not_scheduled": [
      {
        "id": <task_id>,
        "name": "<task_name>",
        "description": "<task_description>",
        "duration": <task_duration_in_seconds>
        "scheduled": <boolean>,
        "completed": <boolean>,
        "user_id": <TWAIN_USER_ID>
      },
      ...
    ], 
    "scheduled": [
      {
        "id": <task_id>,
        "name": "<task_name>",
        "description": "<task_description>",
        "duration": <task_duration_in_seconds>
        "scheduled": <boolean>,
        "completed": <boolean>,
        "user_id": <TWAIN_USER_ID>
      },
      ...
    ]
  },
  "error": "<ERROR_MESSAGE>"
}
```
**Note:** 
  *`not_scheduled` is ordered by most recently added at the top
  *`scheduled` is ordered by increasing chronological order

### Set Tasks Complete by ID (Array of IDs) 
POST /api/tasks/complete_task
```
{
	"ids": [<array_of_task_ids>]
}
```
returns
```
{
    "data": [
        {
            "id": <event_id>,
            "name": "<event_name>",
            "description": "<event_description>",
            "duration": <task_duration_in_seconds>,
            "scheduled": <boolean>,
            "completed": <boolean>,
            "timecompleted": "<timestamp>"
        },
        {
            "id2": <event_id2>,
            "name2": "<event_name2>",
            "description2": "<event_description2>",
            "duration2": <task_duration_in_seconds2>,
            "scheduled2": <boolean2>,
            "completed2": <boolean2>,
            "timecompleted2": "<timestamp2>"
        }
    ],
    "error": "<ERROR_MESSAGE>"
}
```

### Create Event
POST /api/events/
```
{
  "name": "<event_name>"
}
```
returns
```
{
  "data": {
    "id": <event_id>,
    "created_at": <timestamp>
    "name": "<event_name>"
  },
  "error": "<ERROR_MESSAGE>"
}
```

### Get event by ID
GET /api/events/{id}

returns
```
{
  "data": {
    "id": <event_id>,
    "created_at": <timestamp>
    "name": "<event_name>"
  },
  "error": "<ERROR_MESSAGE>"
}
```

### Set Tasks Complete by ID (Array of IDs) 
POST /api/tasks/complete_task
```
{
	"ids": [<array_of_task_ids>]
}
```
returns
```
{
    "data": [
        {
            "id": <event_id>,
            "name": "<event_name>",
            "description": "<event_description>",
            "duration": <task_duration_in_seconds>,
            "scheduled": <boolean>,
            "completed": <boolean>,
            "timecompleted": "<timestamp>"
        },
        {
            "id2": <event_id2>,
            "name2": "<event_name2>",
            "description2": "<event_description2>",
            "duration2": <task_duration_in_seconds2>,
            "scheduled2": <boolean2>,
            "completed2": <boolean2>,
            "timecompleted2": "<timestamp2>"
        }
    ],
    "error": "<ERROR_MESSAGE>"
}
```
