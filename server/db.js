const config = require('../config.js');
const DB = config.DB_TYPE === 'mysql'
  ? require('./database-mysql.js')
  : require('./database.js');
module.exports = DB;
