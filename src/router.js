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

var Router = module.exports = function(app) {
    
    this.app = app;

    this.app.get('/', this.hello);
    this.app.get('/count', this.count);
    this.app.get('/question/:question', this.getQuestion);
    this.app.put('/question', this.updateQuestion);
    this.app.post('/question', this.createQuestion);
    this.app.post('/question', this.deleteQuestion);

    this.setupRoutes();

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
    Question.count(function(err, count) {
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
    Question.findOne({question: req.params.question}, function(err, question) {
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
            parsedQuestion = importer.parseQuestionString(questionData.question);

        questionData.operator = parsedQuestion.operator;
        questionData.firstNumber = parsedQuestion.firstNumber;
        questionData.secondNumber = parsedQuestion.secondNumber;
    }

    var question = new Question(questionData);
    question.save(function(err) {
        if(err === null) {
            res.status(200).json({ok: true});
        } else {
            console.log(err);
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
    
};


/**
 * Delete a question's records
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.deleteQuestion = function(req, res) {
    Question.findOne({question: req.params.question}, function(err, question) {
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
