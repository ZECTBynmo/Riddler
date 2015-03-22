/*jslint node: true */
/*global it, describe */
'use strict';

/**
 * Module dependencies.
 */

var _ = require('underscore'),
    Server = require('../src/server'),
    request = require('request'),
    supertest = require('supertest'),
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
                    done('Failed to parse question');
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

        it('should start up the server', function(done) {
            var port = 11111,
                server = new Server({port: port});

            supertest(server.app)
                .get('/')
                .expect(200)
                .end(function(err, res) {
                    if(err) {
                        done(err);
                    } else if(!res.body.ok) {
                        done(('Not okay?'));
                    } else {
                        done();
                    }
                });
        });

        it('should return the current count of questions', function(done) {
            var port = 22222,
                server = new Server({port: port});

            supertest(server.app)
                .get('/count')
                .expect(200)
                .end(function(err, res) {
                    if(err) {
                        done(err);
                    } else if(res.body.count === undefined || res.body.count === null) {
                        done('Failed to fetch question count');
                    } else {
                        done();
                    }
                });
        });

        it('should fetch a question', function(done) {
            var question = 'What is 9532 - 6281?',
                escapedQuestion = encodeURIComponent(question);

            var port = 33333,
                server = new Server({port: port});

            supertest(server.app)
                .get('/question/' + escapedQuestion)
                .expect(200)
                .end(function(err, res) {
                    if(err) {
                        done(err);
                    } else if(res.body.question !== question) {
                        done('Failed to fetch question');
                    } else {
                        done();
                    }
                });
        });

        it('should create a question', function(done) {
            var port = 44444,
                server = new Server({port: port}),
                question = 'What is 1 + 1?',
                escapedQuestion = encodeURIComponent(question),
                questionUrl = '/question/' + escapedQuestion;

            var questionData = {
                distractors: [5, 6, 8],
                question: question,
                answer: 2,
            };

            server.db.Question.findOneAndRemove({question: question}, function() {
                supertest(server.app)
                    .post(questionUrl)
                    .send(questionData)
                    .expect(200)
                    .end(function(err, res) {
                        if(err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });

        it('should fail to create an improperly formed question', function(done) {
            var port = 55555,
                server = new Server({port: port}),
                question = "what's 1 + 1?",
                escapedQuestion = encodeURIComponent(question),
                questionUrl = '/question/' + escapedQuestion;

            var questionData = {
                distractors: [5, 6, 8],
                question: question,
                answer: 2,
            };

            server.db.Question.findOneAndRemove({question: question}, function() {
                supertest(server.app)
                    .post(questionUrl)
                    .send(questionData)
                    .expect(500)
                    .end(function(err, res) {
                        done();
                    });
            });
        });

        it('should fail creation if the answer is wrong', function(done) {
            var port = 66666,
                server = new Server({port: port}),
                question = "What is 1 + 1?",
                escapedQuestion = encodeURIComponent(question),
                questionUrl = '/question/' + escapedQuestion;

            var questionData = {
                distractors: [5, 6, 8],
                question: question,
                answer: 3,
            };

            server.db.Question.findOneAndRemove({question: question}, function() {
                supertest(server.app)
                    .post(questionUrl)
                    .send(questionData)
                    .expect(500)
                    .end(function(err, res) {
                        if(err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });

        it('should fail creation if the distractors repeat', function(done) {
            var port = 77777,
                server = new Server({port: port}),
                question = "What is 1 + 1?",
                escapedQuestion = encodeURIComponent(question),
                questionUrl = '/question/' + escapedQuestion;

            var questionData = {
                distractors: [5, 5, 8],
                question: question,
                answer: 2,
            };

            server.db.Question.findOneAndRemove({question: question}, function() {
                supertest(server.app)
                    .post(questionUrl)
                    .send(questionData)
                    .expect(500)
                    .end(function(err, res) {
                        if(err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });

    });

});
