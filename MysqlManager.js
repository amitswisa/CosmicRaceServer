const mysql = require("mysql");

class MysqlManager {
  constructor(config) {
    this.connection = mysql.createConnection(config);
    try {
      this.connection.connect();
      console.log("Mysql is connected.");
    } catch (err) {
      console.log("Error occured in database.");
    }
  }

  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.connection.end((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

module.exports = MysqlManager; // 👈 Export class
