/*jslint node: true */
'use strict';

/**
 * Module dependencies.
 */

var config = require('../config').db,
    mongoose = require('mongoose');


/**
 * Namespace
 */

var connection = mongoose.createConnection('mongodb://' + config.host + '/' + config.database);
var OPERATORS = ['+', '-', '*', '/'];


/**
 * Schemas
 */

var QuestionSchema = mongoose.Schema({
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

var Question = connection.model('Question', QuestionSchema);

// Validators
Question.schema.path('operator').validate(function(value) {
    return OPERATORS.indexOf(value) != -1;
});

Question.schema.path('distractors').validate(function(value) {
    console.log("VALIDATING");
    var isArray = value.constructor === Array,
        hasNumbers = true;

    if(!isArray) {
        return false;
    } else {
        value.every(function(distractor) {
            if(distractor.constructor !== Number) {
                hasNumbers = false;
                return false;
            }
        });
    }

    return isArray && hasNumbers;
});




/**
 * Exports
 */

module.exports = {
    Question: Question,
};