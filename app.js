const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require("body-parser");

// Pool credentials.
const pool = mysql.createPool({
  host: "38.242.139.88",
  user: "admin_cosmicrace",
  password: "cosmicrace!@#",
  database: "admin_cosmicrace",
  connectionLimit: 15,
});

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Server Port.
const port = 6829;

// Start server and make it listen to port {port}
app.listen(port, () => {
  console.log("Server listening on port 6829");
});

// // API Methods
app.post("/registration", (req, res) => {
  // check if any parameter is missing.
  if (!req.body.username || !req.body.password || !req.body.email) {
    res.status(401).send("Please send all data required.");
  }

  // Validate if username is already exist.
  req.db.getConnection((err, connection) => {
    if (err) return res.status(500).send(err);

    connection.query(
      "SELECT Count(username) as num FROM GameUsers where username = ?",
      [req.body.username],
      (err, result) => {
        if (err) {
          connection.release();
          return res.status(500).send(err);
        }

        // Check if username already exist.
        if (result[0].num !== 0)
          return res.status(401).send("This username isnt available.");

        connection.query(
          "INSERT INTO GameUsers (`username`,`password`,`email`,`coinsAmount`) VALUES (?,?,?,?)",
          [req.body.username, req.body.password, req.body.email, 0],
          (err, result) => {
            connection.release();
            if (err) return res.status(500).send(err);

            return res.status(200).send("Your account created succesfully!");
          }
        );
      }
    );
  });
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

  req.db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }

    let auth =
      "SELECT Count(username) AS num FROM GameUsers WHERE username = ? AND password = ?";

    connection.query(auth, [username, password], (err, result) => {
      connection.release();
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }

      if (result[0].num !== 1)
        return res
          .status(401)
          .send("Login credentials arent exist in our database..");

      return res.status(200).send("Logged in succesfully!");
    });
  });
});

app.get("/test", (req, res) => {
  return res.status(200).send("Hello :)");
});
