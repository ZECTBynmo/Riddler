/*jslint node: true */
'use strict';

/**
 * Module dependencies.
 */

var _ = require('underscore'),
    config = require('../config').db,
    mongoose = require('mongoose'),
    Importer = require('./importer');


/**
 * Namespace
 */

var OPERATORS = ['+', '-', '*', '/'];

/**
 * Prototype
 */

var Database = module.exports = function(importer) {

    this.uri = process.env.MONGOLAB_URI || 'mongodb://' + config.host + '/' + config.database;
    this.importer = new Importer();
    this.connection = mongoose.createConnection(this.uri);

    /**
     * Schemas
     */

    this.QuestionSchema = mongoose.Schema({
        // The list of wrong answers used to distract users
        distractors: {
            type: Array,
            required: true
        },
        
        // Full question, our unique key, indexed for speed
        question: {
            type: String,
            index:  {unique: true},
            unique: true,
            required: true,
        },
        
        // The first number in the question
        firstNumber: {
            type: Number,
            required: true,
        },
        
        // The operator we're performing in this question
        operator: {
            type: String,
            required: true,
        },
        
        // The second number in the question
        secondNumber: {
            type: Number,
            required: true,
        },
        
        // The answer to the question
        answer: {
            type: Number,
            required: true,
        },
    });

    /**
     * Models
     */

    this.Question = this.connection.model('Question', this.QuestionSchema);
    this.Question.schema.path('answer').validate(this.bind(this.validateAnswer));
    this.Question.schema.path('operator').validate(this.bind(this.validateOperator));
    this.Question.schema.path('question').validate(this.bind(this.validateQuestion));
    this.Question.schema.path('distractors').validate(this.bind(this.validateDistractors));

};


/**
 * Returns a validator/function that has been bound with the proper context
 *
 * @api private
 */

Database.prototype.bind = function(fn) {
    var _this = this;

    var boundHandler = function(value) {
        return fn.call(this, value, _this);
    };

    return boundHandler;
};


/**
 * Validate distractor array
 *
 * @param {Array} series of distractors
 * @api private
 */

Database.prototype.validateDistractors = function(distractors) {
    var isArray = distractors.constructor === Array,
        doesRepeat = false,
        hasNumbers = true,
        histogram = {};


    if(!isArray) {
        return false;
    } else {
        _.each(distractors, function(distractor) {
            if(histogram[distractor] === undefined) {
                histogram[distractor] = true;
            } else {
                doesRepeat = true;
            }

            if(distractor.constructor !== Number) {
                hasNumbers = false;
                return false;
            }
        });
    }

    return isArray && hasNumbers && !doesRepeat;
};


/**
 * Validate question
 *
 * @param {String} operator string (+, -, *, or /)
 * @param {Object} Database instance for execution context
 * @api private
 */

Database.prototype.validateQuestion = function(question, _this) {
    try {
        _this.importer.parseQuestionString(question);
        return true;
    } catch(exception) {
        return false;
    }
};


/**
 * Validate operator
 *
 * @param {String} operator string (+, -, *, or /)
 * @api private
 */

Database.prototype.validateOperator = function(operator) {
    return OPERATORS.indexOf(operator) != -1;
};


/**
 * Validate answer
 *
 * @param {Number} question answer
 * @api private
 */

Database.prototype.validateAnswer = function(answer) {
    var isNumber = answer.constructor === Number,
        isCorrect = answer == this.firstNumber + this.secondNumber;

    return isNumber && isCorrect;
};