const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Server Port.
const port = 6829;

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "cosmicrace_db",
});

connection.connect((err) => {
  if (err) throw err;
  console.log("MYSQL Connected!");
});

app.listen(port, () => {
  console.log("Server listening on port 6829");
});

app.post("/userAuthenticate", (req, res) => {});
