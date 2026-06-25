const config = require('../../config.js');
const DB = config.DB_TYPE === 'mysql' ? require('./mysql.js') : require('./sqlite.js');
module.exports = DB;
