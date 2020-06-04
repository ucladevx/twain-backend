const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const config = require("./config");

const { PostgresDB } = require("./db/postgres");
const { UserRepo } = require("./models/user/postgres");
const { UserModel } = require("./models/user");
const { UserController } = require("./controllers/user");

const { EventRepo } = require("./models/event/postgres");
const { EventModel } = require("./models/event");
const { EventController } = require("./controllers/event");

const { TaskRepo } = require("./models/task/postgres");
const { TaskModel } = require("./models/task");
const { TaskController } = require("./controllers/task");

const { ScheduleController } = require("./controllers/schedule");

const { AuthService } = require("./services/auth");
const { GoogleAPIService } = require("./services/googleapis");
const { ScheduleService } = require("./services/schedule");

function start(httpPort, httpsPort) {
  const postgres = PostgresDB(config.database);

  // Set up models
  const userRepo = UserRepo(postgres);
  userRepo.setupRepo();
  const userModel = UserModel(userRepo);

  const eventRepo = EventRepo(postgres);
  eventRepo.setupRepo();
  const eventModel = EventModel(eventRepo);

  const taskRepo = TaskRepo(postgres);
  taskRepo.setupRepo();
  const taskModel = TaskModel(taskRepo);

  // Set up services
  const authService = AuthService(userModel);
  const googleAPIService = GoogleAPIService();
  const scheduleService = ScheduleService();

  // Set up controllers
  const userController = UserController(
    userModel,
    authService,
    googleAPIService
  );
  const eventController = EventController(eventModel);
  const taskController = TaskController(
    taskModel,
    userModel,
    authService,
    googleAPIService
  );
  const scheduleController = ScheduleController(
    userModel,
    taskModel,
    authService,
    googleAPIService,
    scheduleService
  );

  const app = express();
  app.disable("x-powered-by");
  app.use(compression());
  app.use(morgan("dev"));
  app.use(cors());
  app.use(cookieParser());
  app.use(bodyParser.json());
  app.use(express.static(__dirname, { dotfiles: "allow" }));
  app.enable("trust proxy");

  app.use(function (req, res, next) {
    if (req.secure) next();
    else res.redirect("https://" + req.headers.host + req.url);
  });

  // Certificate
  const privateKey = fs.readFileSync(
    "/etc/letsencrypt/live/twaintasks.com/privkey.pem",
    "utf8"
  );
  const certificate = fs.readFileSync(
    "/etc/letsencrypt/live/twaintasks.com/fullchain.pem",
    "utf8"
  );
  const ca = fs.readFileSync(
    "/etc/letsencrypt/live/twaintasks.com/chain.pem",
    "utf8"
  );

  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };

  const router = express.Router();
  router.use("/users", userController);
  router.use("/events", eventController);
  router.use("/tasks", taskController);
  router.use("/schedule", scheduleController);

  app.use("/api", router);

  // Serve the static webpage
  app.get("/", async (req, res) => {
    res.sendFile(path.join(__dirname, "./static", "index.html"));
  });

  // Serve the static assets
  app.get("/static/:name", async (req, res) => {
    res.sendFile(path.join(__dirname, "./static", req.params.name));
  });

  const httpServer = http.createServer(app);
  const httpsServer = https.createServer(credentials, app);

  httpServer.listen(httpPort, () => {
    console.log(`Listening on httpPort ${httpPort}`);
  });
  httpsServer.listen(httpsPort, () => {
    console.log(`Listening on httpsPort ${httpsPort}`);
  });
}

start(config.httpPort, config.httpsPort);
