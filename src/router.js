/*jslint node: true */
'use strict';

/**
 * Module dependencies.
 */

var _ = require('underscore'),
    Importer = require('./importer'),
    Question = require('./db').Question;


/**
 * Prototype
 */

var Router = module.exports = function(app, db) {
    
    this.app = app;
    this.db = db;

    this.app.get('/', this.hello);
    this.app.get('/count', this.bindHandler(this.count));
    this.app.get('/question/:question', this.bindHandler(this.getQuestion));
    this.app.put('/question/:question', this.bindHandler(this.updateQuestion));
    this.app.post('/question/:question', this.bindHandler(this.createQuestion));
    this.app.post('/question/:question', this.bindHandler(this.deleteQuestion));

    this.setupRoutes();

};


/**
 * Returns a route handler that has been bound with the proper context
 *
 * @api private
 */

Router.prototype.bindHandler = function(handler) {
    var _this = this;

    var boundHandler = function() {
        handler.apply(_this, arguments);
    };

    return boundHandler;
};


/**
 * Setup our routes
 *
 * @api private
 */

Router.prototype.setupRoutes = function() {
    var _this = this;

    _.each(this.routes, function(handler, route) {
        _this.app.get(route, handler);
    });
};


/**
 * Hello!
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.hello = function(req, res) {
    res.status(200).json({ok: true});
};


/**
 * Returns the number of questions we currently have
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.count = function(req, res) {
    this.db.Question.count(function(err, count) {
        if(err === null) {
            res.status(200).json({count: count});
        } else {
            res.status(500).json({err: err});
        }
    }); 
};


/**
 * Find questions by question string
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.getQuestion = function(req, res) {
    this.db.Question.findOne({question: req.params.question}, function(err, question) {
        if(err === null) {
            res.status(200).json(question);
        } else {
            res.status(500).json({err: err});
        }
    });
};


/**
 * Create records for a new question
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.createQuestion = function(req, res) {
    var questionData = req.body;

    if(questionData.firstNumber === undefined || 
       questionData.secondNumber === undefined || 
       questionData.operator === undefined) {

        var importer = new Importer(),
            parsedQuestion = {};

        // Parsing an improperly formed question may throw an exception, so we try/catch
        try {
            parsedQuestion = importer.parseQuestionString(questionData.question);
        } catch(exception) {
            var err = 'Improperly formed question string - the expected format is ' + 
                      '"What is [first number] [operator] [second number]?';

            return res.status(500).json({err: err});
        }

        questionData.operator = parsedQuestion.operator;
        questionData.firstNumber = parsedQuestion.firstNumber;
        questionData.secondNumber = parsedQuestion.secondNumber;
    }

    var question = new this.db.Question(questionData);
    question.save(function(err) {
        if(err === null) {
            res.status(200).json({ok: true});
        } else {
            res.status(500).json({err: err});
        }
    });
};


/**
 * Update a question's records
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.updateQuestion = function(req, res) {
    var update = req.body,
        query = this.getUniqueQuery(req);

    // In order to pass our update through validation, we find the object being referred to, apply
    // our update, and call .save() on it, so that Mongoose's internal middleware is engaged
    this.db.Question.findOne(query, {$set: update}, function(err, doc) {
        if(err) {
            res.status(500).json({err: err});
        } else if(doc === null) {
            res.status(404).json({err: 'no such document'});
        } else {
            // Apply our update to the document
            _.extend(doc, update);

            // Save our changes
            doc.save(function(err) {
                if(err) {
                    res.json(500).json({err: err});
                } else {
                    res.status(200).json({ok: true});
                }
            });
        }
    });
};


/**
 * Delete a question's records
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.deleteQuestion = function(req, res) {
    this.db.Question.findOneAndRemove({question: req.params.question}, function(err, question) {
        if(err === null) {
            if(question === null) {
                res.status(500).json({err: 'Failed to find question ' + req.params.question});

            }

            question.remove(function(err) {
                if(err) {
                    res.status(500).json({err: err});
                } else {
                    res.status(200).json({ok: true});
                }
            });
        } else {
            res.status(500).json({err: err});
        }
    });
};


/**
 * Get the uniquely identifying query being specified in a request's parameters
 *
 * @param {Object} express request object
 * @api private
 */

Router.prototype.getUniqueQuery = function(req) {
    var params = req.params,
        query = {};

    if(params.question !== undefined) {
        query.question = params.question;
    } else if(params.firstNumber !== undefined && 
              params.secondNumber !== undefined && 
              params.operator !== undefined) {

        query.operator = params.operator;
        query.firstNumber = params.firstNumber;
        query.secondNumber = params.secondNumber;
    }

    return query;
};
