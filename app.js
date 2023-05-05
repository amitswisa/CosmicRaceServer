require("dotenv").config();
const config = require("./config/config");
const express = require("express");
const corss = require("cors");
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

/* Middleware of application. */
app.use(corss());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.db = pool;
  req.next();
});

const allowedIPs = ["20.87.213.225"]; // List of allowed IP addresses

// Middleware function to check if the request is coming from an allowed IP address
const allowOnlyFromIPs = (req, res, next) => {
  const clientIP = req.ip; // Get the IP address of the client making the request
  if (allowedIPs.includes(clientIP)) {
    // If the client's IP is in the allowed IPs list, proceed to the endpoint
    next();
  } else {
    // If the client's IP is not in the allowed IPs list, send a 403 Forbidden response
    res.status(403).send({
      message: "unauthorized access",
    });
  }
};

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
          return res.status(500).send({
            success: false,
            message: err.message,
          });
        }

        // Check if username already exist.
        if (result[0].num !== 0)
          return res.status(401).send({
            success: false,
            message: "This username isnt available.",
          });

        connection.query(
          "INSERT INTO GameUsers (`username`,`password`,`email`,`level`,`coinsAmount`, `loses`, `wins`) VALUES (?,?,?,?,?,?,?)",
          [req.body.username, req.body.password, req.body.email, 1, 1000, 0, 0],
          (err, userInsertResult) => {
            if (err) {
              connection.release();
              return res.status(500).send({
                success: false,
                message: err.message,
              });
            }

            const characterQuery =
              "INSERT INTO userscharactersdata (userID, characterID, level, xp, magicPoints, speed, jump, power, defense) SELECT User.id, gc.id, gc.level, gc.xp, gc.magicPoints, gc.speed, gc.jump, gc.power, gc.defense FROM gamecharacters gc, GameUsers User WHERE User.username = '" +
              req.body.username +
              "'";
            connection.query(characterQuery, [], (err, userCharacterInsert) => {
              connection.release(); // Release connection at the end to the pool.

              if (err)
                return res.status(500).send({
                  success: false,
                  message: err.message,
                });

              return res.status(200).send({
                success: true,
                message: "Your account created succesfully!",
              });
            });
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
      "SELECT GU.id, GU.username, GU.level, GU.coinsAmount, UCD.characterID, GC.CharacterName, UCD.level, UCD.xp, UCD.magicPoints, UCD.speed, UCD.jump, UCD.power, UCD.defense, UCD.winCount, UCD.loseCount FROM GameUsers GU JOIN userscharactersdata UCD ON (UCD.userid = GU.id) Join GameCharacters GC ON (GC.id = UCD.characterID) WHERE GU.username = ? AND GU.password = ?";

    connection.query(auth, [username, password], (err, result) => {
      // Release coonection back to the pool.
      connection.release();

      if (err) {
        console.log(err);
        return res.status(500).send({
          message: err.message,
        });
      }

      if (result.length <= 0)
        return res.status(401).send({
          message: "Login credentials arent exist in our database..",
          success: false,
        });

      // Create JWT token.
      const token = jwt.sign(
        {
          userId: result[0].id,
          userName: result[0].username,
          coinsAmount: result[0].coinsAmount,
        },
        config.jwtSecretKey,
        { expiresIn: "48h" }
      );

      res.status(200).send({
        message: "Sign in succesfull",
        success: true,
        username: username,
        token: token,
        level: result[0].level,
        coins: result[0].coinsAmount,
        characters: [
          {
            characterID: result[0].characterID,
            characterName: result[0].CharacterName,
            level: result[0].level,
            xp: result[0].xp,
            magicPoints: result[0].magicPoints,
            speed: result[0].speed,
            power: result[0].power,
            defense: result[0].defense,
            jump: result[0].jump,
            wins: result[0].winCount,
            loses: result[0].loseCount,
          },
          {
            characterID: result[1].characterID,
            characterName: result[1].CharacterName,
            level: result[1].level,
            xp: result[1].xp,
            magicPoints: result[1].magicPoints,
            speed: result[1].speed,
            power: result[1].power,
            defense: result[1].defense,
            jump: result[0].jump,
            wins: result[1].winCount,
            loses: result[1].loseCount,
          },
          {
            characterID: result[2].characterID,
            characterName: result[2].CharacterName,
            level: result[2].level,
            xp: result[2].xp,
            magicPoints: result[2].magicPoints,
            speed: result[2].speed,
            power: result[2].power,
            defense: result[2].defense,
            jump: result[0].jump,
            wins: result[2].winCount,
            loses: result[2].loseCount,
          },
          {
            characterID: result[3].characterID,
            characterName: result[3].CharacterName,
            level: result[3].level,
            xp: result[3].xp,
            magicPoints: result[3].magicPoints,
            speed: result[3].speed,
            power: result[3].power,
            defense: result[3].defense,
            jump: result[0].jump,
            wins: result[3].winCount,
            loses: result[3].loseCount,
          },
        ],
      });

      return;
    });
  });
});

app.post("/update-user-data", authorization, (req, res) => {
  const username = req.body.username;

  if (!username) {
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

    const query =
      "SELECT coinsAmount, wins, loses FROM GameUsers WHERE username = ?";

    connection.query(query, [username], (err, result) => {
      // Release coonection back to the pool.
      connection.release();

      if (err) {
        console.log(err);
        return res.status(500).send({
          message: err,
        });
      }

      if (result.length <= 0)
        return res.status(401).send({
          message: "Username doesn't exist.",
          success: false,
        });

      res.status(200).send({
        success: true,
        coins: result[0].coinsAmount,
        wins: result[0].wins,
        loses: result[0].loses,
      });

      return;
    });
  });
});

app.post("/change-password", authorization, (req, res) => {
  const newPassword = req.body.password;

  if (newPassword.length < 6)
    return res.status(500).send({
      message: "Information missing.",
      success: false,
    });

  req.db.getConnection((err, connection) => {
    // Connection failed.
    if (err) {
      return res.status(500).send({
        success: false,
        message: err,
      });
    }

    const query = "UPDATE GameUsers SET password = ? WHERE id = ?";

    connection.query(
      query,
      [newPassword, req.userInfo.userId],
      (err, result) => {
        connection.release();

        if (err) {
          return res.status(500).send({
            success: false,
            message: err,
          });
        }

        return res.status(200).send({
          success: true,
          message: "Password has been changed!",
        });
      }
    );
  });
});

// Post request -> receives from game server username & character id.
// return: Character Data.
app.post("/fetchCharacterData", allowOnlyFromIPs, (req, res) => {
  // Params from json in request body.
  const username = req.body.username;
  const characterId = req.body.characterId;

  if(username === "" || characterId === "")
  {
    return res.status(404).({
      message: "Missing information.",
    });
  }

  // Fetch data from database about player.
  // req.db.getConnection((err, connection) => {
  //   if (err) return res.status(500).send(err);

  //   connection.query("SELECT ")
  // });

  res.status(200).send({
    message: "Work!",
  });
});
