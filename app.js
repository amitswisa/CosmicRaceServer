const MysqlManager = require("./MysqlManager.js");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Server Port.
const port = 6829;

const mysqlManager = new MysqlManager({
  host: "localhost",
  user: "root",
  password: "",
  database: "cosmicrace_db",
});

app.listen(port, () => {
  console.log("Server listening on port 6829");
});

app.post("/registration", (req, res) => {
  // check if any parameter is missing.
  if (!req.body.username || !req.body.password || !req.body.email) {
    res.status(401).send("Please send all data required.");
  }

  // Validate if username is already exist.
  mysqlManager
    .query("SELECT Count(username) as num FROM gameusers where username = ?", [
      req.body.username,
    ])
    .then((result) => {
      if (result[0].num === 1) {
        res.status(403).send("Username already exist in our database.");
      } else {
        // No such user exist -> insert to database.
        mysqlManager
          .query(
            "INSERT INTO gameusers (`username`, `password`, `email`) VALUES (?,?,?)",
            [req.body.username, req.body.password, req.body.email]
          )
          .then((result) => {
            res.status(200).send("Sign up successfully!");
          }, res)
          .catch((err) => res.status(403).send("Error occured!"), res);
      }
    }, res)
    .catch((err) => res.status(403).send("Error occured!"), res);
});

/*
    # Login HTTP - POST Method.
    # Req body: Json of username and password.
    # Response: TRUE || FALSE -> cardentials.
*/
app.post("/login", (req, res) => {});
