/*jslint node: true */
'use strict';

/**
 * Module dependencies
 */

var Server = require('./src/server');


/**
 * Main Startup
 */
 
var server = new Server();
server.run(function() {
    console.log('Question server running');
});