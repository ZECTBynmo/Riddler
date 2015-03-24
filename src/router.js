/*jslint node: true */
'use strict';

/**
 * Module dependencies.
 */

var _ = require('underscore'),
    Importer = require('./importer');


/**
 * Prototype
 */

var Router = module.exports = function(app, db) {
    
    this.app = app;
    this.db = db;

    this.app.get('/', this.hello);
    this.app.get('/count', this.bindHandler(this.count));
    this.app.get('/question', this.bindHandler(this.getQuestions));
    this.app.get('/question/:question', this.bindHandler(this.getQuestion));
    this.app.get('/question/first/:firstNumber/operator/:operator/second/:secondNumber', this.bindHandler(this.getQuestion));

    this.app.put('/question/:question', this.bindHandler(this.updateQuestion));
    this.app.put('/question/first/:firstNumber/operator/:operator/second/:secondNumber', this.bindHandler(this.updateQuestion));
    
    this.app.post('/question/:question', this.bindHandler(this.createQuestion));
    this.app.post('/question/first/:firstNumber/operator/:operator/second/:secondNumber', this.bindHandler(this.createQuestion));
    
    this.app.delete('/question/:question', this.bindHandler(this.deleteQuestion));
    this.app.delete('/question/first/:firstNumber/operator/:operator/second/:secondNumber', this.bindHandler(this.deleteQuestion));

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
    var query = this.getQuery(req);

    this.db.Question.count(query, function(err, count) {
        if(err === null) {
            res.status(200).json({count: count});
        } else {
            res.status(500).json({err: err});
        }
    }); 
};


/**
 * Fetch a single question
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.getQuestion = function(req, res) {
    var query = this.getUniqueQuery(req);

    this.db.Question.findOne(query, function(err, question) {
        if(err === null) {
            if(question === null) {
                res.status(404).json({message: 'no such question'});
            } else {
                res.status(200).json(question);
            }
        } else {
            res.status(500).json({err: err});
        }
    });
};


/**
 * Build a query for a given request
 *
 * @param {Object} express request
 * @api private
 */

Router.prototype.getQuery = function(req) {
    var query = {};

    function addToQuery(param, queryName) {
        if(req.query[param] !== undefined) {
            if(req.query.range !== undefined && param != 'operator') {
                if(req.query.range == 'gt') {
                    query[queryName] = {$gt: req.query[param]};
                } else {
                    query[queryName] = {$lt: req.query[param]};
                }
            } else {
                query[queryName] = req.query[param];
            }
        }
    }

    addToQuery('first', 'firstNumber');
    addToQuery('answer', 'answer');
    addToQuery('second', 'secondNumber');
    addToQuery('operator', 'operator');

    if(req.query.distractor !== undefined) {
        var distractor = Number(req.query.distractor);
        if(req.query.numDistractors !== undefined) {
            query.distractors = {$and: 
                [
                    {$in: [distractor]},
                    {$size: req.query.numDistractors}
                ]
            };
        } else {
            query.distractors = {$in: [distractor]};
        }
    } else {
        if(req.query.numDistractors !== undefined) {
            query.distractors = {$size: req.query.numDistractors};
        }
    }

    return query;
};


/**
 * Fetch multiple questions by query
 *
 * @param {Object} express request object
 * @param {Object} express response object
 * @api private
 */

Router.prototype.getQuestions = function(req, res) {
    var page = req.query.page || 0,
        query = this.getQuery(req),
        order = req.query.order || 'asc',
        sortKey = req.query.sort_key || 'question',
        pageSize = req.query.per_page || 250;

    var sort = {};
    sort[sortKey] = order == 'asc' ? 1 : -1;

    this.db.Question.find(query)
        .sort(sort)
        .skip(page * pageSize)
        .limit(pageSize)
        .exec(function(err, questions) {
            if(err) {
                res.status(500).json({err: err});
            } else {
                res.status(200).json(questions);
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
    } else if(questionData.question === undefined) {
        questionData.question = 'What is ' + questionData.firstNumber + ' ' + 
                                questionData.operator + ' ' + questionData.secondNumber;
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
    this.db.Question.findOne(query, function(err, doc) {
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
                    res.status(500).json({err: err});
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
    var query = this.getUniqueQuery(req);

    this.db.Question.findOneAndRemove(query, function(err, question) {
        if(err === null) {
            if(question === null) {
                res.status(404).json({err: 'Failed to find question ' + req.params.question});
            } else {
                question.remove(function(err) {
                    if(err) {
                        res.status(500).json({err: err});
                    } else {
                        res.status(200).json({ok: true});
                    }
                });
            }            
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
