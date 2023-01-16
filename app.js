const MysqlManager = require("./MysqlManager.js");

const mysqlManager = new MysqlManager({
  host: "www.webrk.com",
  user: "admin_cosmicrace",
  password: "cosmicrace!@#",
  database: "admin_cosmicrace",
});

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Server Port.
const port = 6829;

// Start server and make it listen to port {port}
app.listen(port, () => {
  console.log("Server listening on port 6829");
});

// API Methods
app.post("/registration", (req, res) => {
  // check if any parameter is missing.
  if (!req.body.username || !req.body.password || !req.body.email) {
    res.status(401).send("Please send all data required.");
  }

  // Validate if username is already exist.
  mysqlManager
    .query("SELECT Count(username) as num FROM GameUsers where username = ?", [
      req.body.username,
    ])
    .then((result) => {
      if (result[0].num === 1) {
        res.status(403).send("Username already exist in our database.");
      } else {
        // No such user exist -> insert to database.
        mysqlManager
          .query(
            "INSERT INTO GameUsers (`username`, `password`, `email`, `coinsAmount`) VALUES (?,?,?,?)",
            [req.body.username, req.body.password, req.body.email, 0]
          )
          .then((result) => {
            res.status(200).send("Sign up successfully!");
          })
          .catch((err) => res.status(403).send("Error occured!"));
      }
    }, res)
    .catch((err) => res.status(403).send("Error occured!"), res);
});

/*
    # Login HTTP - POST Method.
    # Req body: Json of username and password.
    # Response: TRUE || FALSE -> cardentials.
*/
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.status(401).send("Please send all data required.");
  }

  let auth =
    "SELECT Count(username) AS num FROM gameusers WHERE username = ? AND password = ?";

  mysqlManager
    .query(auth, [username, password])
    .then((result) => {
      // Check if user exist and login is approved.
      if (result[0].num !== 1) {
        res.status(401).send("User doesn't exist!");
      } else {
        res.status(200).send("Logged in successfully!");
      }
    })
    .catch((err) => {
      res.status(401).send("Error occured!");
    });
});
