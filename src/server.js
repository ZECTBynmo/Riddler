/*jslint node: true */
'use strict';

/**
 * Module dependencies.
 */

var bodyParser = require('body-parser'),
    Importer = require('./importer'),
    Database = require('./db'),
    express = require('express'),
    Router = require('./router'),
    config = require('../config'),
    morgan = require('morgan');


/**
 * Prototype
 */

var Server = module.exports = function(options) {

    options = options || {};

    this.port = options.port || config.port;
    this.db = new Database();
    this.importer = new Importer(this.db);
    
    this.app = express();
    this.app.use(morgan('dev'));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({extended: false}));

    this.router = new Router(this.app, this.db);

};


/**
 * Start listening on our port
 *
 * @api public
 */

Server.prototype.run = function(callback) {
    var _this = this;

    // Start listening on the port our config file specifies
    this.api = this.app.listen(this.port, function () {

        // Now that the server is running, import any questions we may have
        _this.importer.import('./questions/questions.csv', function() {
            callback();
        });

    });

};