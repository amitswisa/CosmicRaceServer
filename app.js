require("dotenv").config();
const config = require("./config/config");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const authorization = require("./middleware/auth");

// Pool credentials.
const pool = mysql.createPool({
  host: config.dbHost,
  user: config.dbuser,
  password: config.dbpassword,
  database: config.dbdatabase,
  port: 3306,
  connectionLimit: 15,
  ssl: { ca: fs.readFileSync("./certifications/DigiCertGlobalRootCA.crt.pem") },
});

/* Some use for the app variable */

const app = express();
/*  */
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Start server and make it listen to port {port}
app.listen(process.env.SERVER_PORT, () => {
  console.log("Server listening on port " + process.env.SERVER_PORT);
});

/*
    # Register HTTP - POST Method.
    # Req body: Json of username, password and email.
    # Response: TRUE -> signup success || FALSE -> already exist or other error.
*/
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
    res.status(401).send({
      message: "Please send all data required.",
      success: false,
    });
  }

  req.db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        message: err,
      });
    }

    let auth =
      "SELECT Count(username) AS num, id, username as username FROM GameUsers WHERE username = ? AND password = ?";

    connection.query(auth, [username, password], (err, result) => {
      // Release coonection back to the pool.
      connection.release();

      if (err) {
        console.log(err);
        return res.status(500).send({
          message: err,
        });
      }

      if (result[0].num !== 1)
        return res.status(401).send({
          message: "Login credentials arent exist in our database..",
          success: false,
        });

      // Create JWT token.
      const token = jwt.sign(
        {
          userId: result[0].num,
          userName: result[0].username,
        },
        config.jwtSecretKey,
        { expiresIn: "48h" }
      );

      res.status(200).send({
        message: "Sign in succesfull",
        success: true,
        token: token,
      });

      return;
    });
  });
});
