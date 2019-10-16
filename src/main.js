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

function start(port) {
  const postgres = PostgresDB(config.database);

  const userRepo = UserRepo(postgres);
  userRepo.setupRepo(); // create user table if doesn't exist

  const userModel = UserModel(userRepo);

  const userController = UserController(userModel);

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

  app.use('/api', router);

  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

start(config.port);
