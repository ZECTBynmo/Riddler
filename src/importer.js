/*jslint node: true */
'use strict';

/**
 * Module dependencies.
 */

var _ = require('underscore'),
    fs = require('fs'),
    Question = require('./db').Question;


/**
 * Namespace
 */

// The indexes of columns within our questions file
var LINE_INDEX_QUESTION = 0,
    LINE_INDEX_ANSWER = 1,
    LINE_INDEX_DISTRACTORS = 2;

var QUESTION_INDEX_FIRST_NUMBER = 2,
    QUESTION_INDEX_OPERATOR = 3,
    QUESTION_INDEX_SECOND_NUMBER = 4;


/**
 * Prototype
 */

var Importer = module.exports = function(options) {
    
    this.options = options || {};

};


/**
 * Import questions into the db from a raw questions file on disk
 *
 * @param {String} path to questions file
 * @param {Function} finished callback
 * @api public
 */

Importer.prototype.import = function(path, callback) {
    var _this = this,
        hasSeenHeadings = false;

    this.eachLine(path, function(line) {
        if(!hasSeenHeadings) {
            hasSeenHeadings = true;
            return;
        }

        var questionData = _this.parseLine(line);

        Question.findOneAndUpdate({
            question: questionData.question
        }, questionData, {upsert: true}, function(err) {
            if(err) {
                console.log('Error while updating database: ' + err);
            }
        });
    }, function() {
        callback();
    });
};


/**
 * Open a file as a stream and iterate over each line
 *
 * @param {String} path to questions file
 * @param {Function} each line callback
 * @param {Function} finished callback
 * @api private
 */

Importer.prototype.eachLine = function(path, lineCallback, finished) {
    var remaining = '',
        fileStream = fs.createReadStream(path);
  
    fileStream.on('data', function(data) {
        remaining += data;
        var index = remaining.indexOf('\n'),
            last  = 0;

        while(index > -1) {
            var line = remaining.substring(last, index);
            
            last = index + 1;
            lineCallback(line);
            index = remaining.indexOf('\n', last);
        }
    
        remaining = remaining.substring(last);
    });
  
    fileStream.on('end', function() {
        if(remaining.length > 0) {
            lineCallback(remaining);
        }

        finished();
    });
};


/**
 * Parse a single line of a questions file
 *
 * @param {String} one full line
 * @api private
 */

Importer.prototype.parseLine = function(line) {

    // Split out our major columns
    var splitLine = line.split('|');

    // Pull out full question string, and parse it into first number, second number, and operator
    var question = splitLine[LINE_INDEX_QUESTION],
        questionData = this.parseQuestionString(question);
        
    // Extract our distractors, which are comma separated values. We strip whitespace for safety
    var strDistractors = splitLine[LINE_INDEX_DISTRACTORS].replace(' ', '').split(','),
        distractors = [];

    _.each(strDistractors, function(distractor) {
        distractors.push(Number(distractor));
    });

    // Pull out the question's answer, strip whitespace
    var strAnswer = splitLine[LINE_INDEX_ANSWER].replace(' ', ''),
        answer = Number(strAnswer);

    // Our line data
    var data = {
        answer: answer,
        operator: questionData.operator,
        question: questionData.question,
        distractors: distractors,
        firstNumber: questionData.firstNumber,
        secondNumber: questionData.secondNumber,
    };

    return data;
};


/**
 * Parse a question string into its component parts
 *
 * @param {String} question string
 * @api private
 */

Importer.prototype.parseQuestionString = function(question) {
    var splitQuestion = question.split(' ');

    // Grab our operator
    var operator = splitQuestion[QUESTION_INDEX_OPERATOR];
    
    // Pull out the feirst and second numbers, and convert them to numbers
    var strFirstNumber = splitQuestion[QUESTION_INDEX_FIRST_NUMBER],
        strSecondNumber = splitQuestion[QUESTION_INDEX_SECOND_NUMBER].replace('?', ''),
        firstNumber = Number(strFirstNumber),
        secondNumber = Number(strSecondNumber);

    return {
        question: question,
        operator: operator,
        firstNumber: firstNumber,
        secondNumber: secondNumber,
    };
};
