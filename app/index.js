"use strict";
const path = require("path");
const { spawn } = require("child_process");
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const siofu = require("socketio-file-upload");
const passport = require("passport");
const { port, jupyter, jupyterPort, setJupyterToken, getJupyterToken, setJupyterURL, getJupyterURL } = require("./db/db");
const { getLogger, setSocketIO, setFilename, setMaxLogSize, setNumBackup, setCompress } = require("./logSettings");

/*
 * set up express, http and socket.io
 */
const app = express();
//TODO if certification setting is available, use https instead
const server = require("http").createServer(app);
const sio = require("socket.io")(server);
setSocketIO(sio);
setFilename(path.resolve(__dirname, "wheel.log"));
setMaxLogSize(8388608);
setNumBackup(5);
setCompress(true);

const logger = getLogger();
//eslint-disable-next-line no-console
process.on("unhandledRejection", console.dir);

//template engine
app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");

//middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: "wheel",
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: "auto"
  }
}));
app.use(express.static(path.resolve(__dirname, "public"), { index: false }));
app.use(siofu.router);
app.use(passport.initialize());
app.use(passport.session());

//routing
const routes = {
  home: require(path.resolve(__dirname, "routes/home"))(sio),
  workflow: require(path.resolve(__dirname, "routes/workflow"))(sio),
  remotehost: require(path.resolve(__dirname, "routes/remotehost"))(sio),
  login: require(path.resolve(__dirname, "routes/login")),
  admin: require(path.resolve(__dirname, "routes/admin"))(sio),
  rapid: require(path.resolve(__dirname, "routes/rapid"))(sio)
};
//TODO 起動時のオプションに応じて/に対するroutingをhomeとloginで切り替える
app.use("/", routes.home);
app.use("/home", routes.home);
app.use("/login", routes.login);
app.use("/admin", routes.admin);
app.use("/workflow", routes.workflow);
app.use("/editor", routes.rapid);
app.use("/remotehost", routes.remotehost);

//port number
const defaultPort = 443;
let portNumber = parseInt(process.env.PORT, 10) || port || defaultPort;

if (portNumber < 0) {
  portNumber = defaultPort;
}
app.set("port", port);

//error handler
//TODO special error handler for 404 should be placed here
app.use((err, req, res)=>{
  logger.error(err);
  //render the error page
  res.status(err.status || 500);
  res.send("something broken!");
});

//Listen on provided port, on all network interfaces.
server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

//boot jupyter
if (jupyter) {
  const cmd = typeof jupyter === "string" ? jupyter : "jupyter";
  const jupyterPortNumber = typeof jupyterPort === "number" && jupyterPort > 1024 && jupyterPort < 65535 ? jupyterPort : port + 1;
  const opts = [
    "notebook",
    "--no-browser",
    `--port ${jupyterPortNumber}`,
    "--port-retries=0",
    "--ip=*",
    "--notebook-dir=/"
  ];

  logger.info(`booting jupyter listenning on localhost:${jupyterPortNumber}`);
  const cp = spawn(cmd, opts, { shell: true });
  cp.stdout.on("data", (data)=>{
    logger.debug(data.toString());
  });
  cp.stderr.on("data", (data)=>{
    const output = data.toString();
    const currentToken = getJupyterToken();
    const currentURL = getJupyterURL();
    if (typeof currentToken === "undefined") {
      const rt = /http.*\?token=(.*)/.exec(output);
      if (rt !== null && typeof rt[1] === "string") {
        setJupyterToken(rt[1]);
      }
    }
    if (typeof currentURL === "undefined") {
      const rt = /(http.*)\?token=.*/.exec(output);
      if (rt !== null && typeof rt[1] === "string") {
        setJupyterURL(rt[1]);
      }
    }
    logger.debug(output);
  });
  cp.on("close", (code)=>{
    logger.debug(`jupyter is closed with ${code}`);
  });
  cp.on("error", (err)=>{
    logger.debug(`get error from jupyter process: ${err}`);
  });
  process.on("exit", ()=>{
    //eslint-disable-next-line no-console
    console.log(`kill jupyter process(${cp.pid}) before exit`);
    cp.kill();
  });
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }
  const bind = typeof port === "string"
    ? `Pipe ${port}`
    : `Port ${port}`;


  //handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      logger.error(`${bind} requires elevated privileges`);
      //eslint-disable-next-line no-process-exit
      process.exit(1);
    case "EADDRINUSE":
      logger.error(`${bind} is already in use`);
      //eslint-disable-next-line no-process-exit
      process.exit(1);
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string"
    ? `pipe ${addr}`
    : `port ${addr.port}`;
  logger.info(`Listening on ${bind}`);
}
