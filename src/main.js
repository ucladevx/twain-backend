const fs = require('fs');
const path = require('path');
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const config = require('./config');

const {PostgresDB} = require('./db/postgres');
const {UserRepo} = require('./models/user/postgres');
const {UserModel} = require('./models/user');
const {UserController} = require('./controllers/user');

const {EventRepo} = require('./models/event/postgres');
const {EventModel} = require('./models/event');
const {EventController} = require('./controllers/event');

const {TaskRepo} = require('./models/task/postgres');
const {TaskModel} = require('./models/task');
const {TaskController} = require('./controllers/task');

function start(port) {
  const postgres = PostgresDB(config.database);

  const userRepo = UserRepo(postgres);
  userRepo.setupRepo();
  const userModel = UserModel(userRepo);
  const userController = UserController(userModel);

  const eventRepo = EventRepo(postgres);
  eventRepo.setupRepo();
  const eventModel = EventModel(eventRepo);
  const eventController = EventController(eventModel);

  const taskRepo = TaskRepo(postgres);
  taskRepo.setupRepo();
  const taskModel = TaskModel(taskRepo);
  const taskController = TaskController(taskModel);

  const app = express();
  app.disable('x-powered-by');
  app.use(compression());
  app.use(morgan('dev'));
  app.use(
    cors({
      origin: ['http://localhost:3000'],
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(bodyParser.json());

  const router = express.Router();
  router.use('/users', userController);
  router.use('/events', eventController);
  router.use('/tasks', taskController);

  app.use('/api', router);

  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

start(config.port);
