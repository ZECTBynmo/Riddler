
/**
 * Module dependencies.
 */

var _ = require('underscore'),
    fs = require('fs'),
    util = require('util'),
    config = require('../config'),
    Server = require('../src/server'),
    request = require('request'),
    supertest = require('supertest')
    TestData = require('./test_data'),
    Importer = require('../src/importer');


/**
 * Importer Tests
 */

describe('Importer', function() {

    describe('#parseLine()', function() {
        it('should parse a single line of a questions file', function(done) {
            var importer = new Importer();
            
            _.each(TestData.lines, function(testConfig) {
                var data = importer.parseLine(testConfig.question);

                if(data.answer != testConfig.answer) {
                    done("Answers don't match");
                }
            });

            done();
        });

        it('should have all expected data', function(done) {
            var importer = new Importer();
            
            _.each(TestData.lines, function(testConfig) {
                var data = importer.parseLine(testConfig.question);

                if(data.answer === undefined) {
                    done('Failed to parse answer');
                } else if(data.question === undefined) {
                    done('Failed to parse question')
                } else if(data.distractors === undefined) {
                    done('Failed to parse distractors');
                }
            });

            done();
        });

        it('should turn numerical data into Numbers', function(done) {
            var importer = new Importer();
            
            _.each(TestData.lines, function(testConfig) {
                var data = importer.parseLine(testConfig.question);

                if(typeof(data.answer) != 'number') {
                    return done('Failed to convert answer to a number');
                }

                _.each(data.distractors, function(distractor) {
                    if(typeof(distractor) != 'number') {
                        return done('Failed to convert distractor to a number');
                    }
                });
            });

            done();
        });

    });

    describe('#eachLine()', function() {

        it('should open a file and iterate over its lines', function(done) {
            var importer = new Importer(),
                index = 0,
                path = __dirname + '/test_file.csv';

            importer.eachLine(path, function(line) {
                if(Number(line) !== index) {
                    done("Failed to read line");
                }

                index++;
            }, function() {
                done();
            });
        });
    });

});


/**
 * Server Tests
 */

describe('Server', function() {

    describe('#run()', function() {

        function get(partial, port, callback) {
            var url = 'http://localhost:' + port + partial;
            request.get(url, callback);
        }

        function del(partial, port, callback) {
            var url = 'http://localhost:' + port + partial;
            request.delete(url, callback);
        }

        function post(partial, data, port, callback) {
            var url = 'http://localhost:' + port + partial;

            var requestData = {
                url: 'http://localhost:' + port + partial,
                form: data
            }

            request.post(requestData, callback);
        }

        function setupTest(path, port, callback) {
            var server = new Server({port: port});
            server.run(function() {
                get(path, port, function(error, response, body) {
                    callback(error, JSON.parse(body), server);
                });
            });
        }

        it('should start up the server', function(done) {          
            setupTest('/', 11111, function(error, data) {
                if(error !== null || !data.ok) {
                    done('Failed to hit endpoint');
                } else {
                    done();
                }
            });
        });

        it('should return the current count of questions', function(done) {
            setupTest('/count', 22222, function(error, data) {
                if(error !== null || data.count === undefined || data.count === null) {
                    done('Failed to fetch question count');
                } else {
                    done();
                }
            });
        });

        it('should fetch a question', function(done) {
            var question = 'What is 9532 - 6281?',
                escapedQuestion = encodeURIComponent(question);

            setupTest('/question/' + escapedQuestion, 33333, function(error, data) {
                if(error !== null || data.question !== question ) {
                    done('Failed to fetch question');
                } else {
                    done();
                }
            });
        });

        it('should create a question', function(done) {
            var port = 44444,
                question = 'What is 1 + 1?',
                escapedQuestion = encodeURIComponent(question),
                questionUrl = '/question/' + escapedQuestion;

            setupTest(questionUrl, port, function(error, data, server) {
                var questionData = {
                    distractors: [5, 5, 8],
                    question: question,
                    answer: 2,
                };

                function createQuestion() {
                    supertest(server.app)
                        .post('/question')
                        .send(questionData)
                        .expect(200)
                        .end(function(err, res) {
                            done();
                        });
                }

                if(error === null && data === null) {
                    createQuestion();
                } else if(error === null) {
                    console.log("DUPLICATE");
                    del(questionUrl, questionData, port, function(error, data) {
                        createQuestion();
                    });
                }
            });
        });

    });

});
