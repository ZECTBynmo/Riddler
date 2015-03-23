# Riddler - RESTful question endpoint

![Image of Yaktocat](http://vignette1.wikia.nocookie.net/batman/images/a/ab/The_Riddler_3.png)

Unit tested node.js express server with mongodb database

## Prerequisites

 * node.js
 * local mongodb


## Installation

```
git clone https://github.com/ZECTBynmo/riddler.git
cd riddler
npm install
```
## Riddle me this
To start up the server, run this from the project directory:

```
node riddler.js
```

## Questions

This server is an http endpoint for questions, so what is a question in concrete terms? A question has a few basic components

 * question string (The full string of the question)
 * answer (The answer to the question)
 * distractors (A series of wrong answers to the question)

A question string takes the following form

```
What is [firstNumber] [operator] [secondNumber]?
```
We can uniquely identify a question by its full question string, or by the combination of firstNumber, secondNumber, and operator. The endpoint lets you choose whichever is more convenient.

## API Usage

The server has a simple RESTful interface. Here's a few example requests:
```
GET /count/questions                                    // Get the current total number of questions

GET /questions                                          // Fetch a list of all questions with default pagination
GET /questions?range=gt&answer=2442                     // Fetch a list of questions with answer > 2442

GET /questions/What%20is%201342%20%2B%205432%3F         // Fetch a single question using the full question string
GET /questions/first/1342/operator/-/second/5432        // Fetch a single question using numbers and operator
PUT /questions/first/1342/operator/-/second/5432        // Update a question (validated)
POST /questions/first/1342/operator/-/second/5432       // Create a new question (validated)
DELETE /questions/first/1342/operator/-/second/5432     // Delete a question
```

A full description of available routes and parameters:

#### GET - fetch questions

Fetch a single question
```
GET /questions/[escaped full question string]
GET /questions/first/[firstNumber]/operator/[operator]/second/[secondNumber]
```

Fetch multiple questions
```
GET /questions
```
Optional query parameters
```
// Selection parameters
first           // The first number in the question
second          // The second number in the question
answer          // The answer to the question
operator        // The operator in the question
range           // 'gt' finds questions greater than your first/second/answer/etc., or 'lt' for less than
distractor      // Find items where this distractor is present
numDistractors  // Find items with this number of distractors

// Pagination parameters
page            // Which page of data to show (defaults to 0)
per_page        // Number of results per page (defaults to 250)
sort_by         // Which parameter to sort by (options are the selection parameters, defaults to nothing)
order           // The sort order ('asc' for ascending, or 'des' for descending, defaults to ascending)
```

#### POST - create new questions

Available url formats:
```
POST /questions/[escaped full question string]
POST /questions/first/[firstNumber]/operator/[operator]/second/[secondNumber]
```
Form data:
```
String  [conditional] question     // Full question string
Number  [required]    answer       // Answer to the question
Array   [required]    distractors  // Array of wrong answer(s) to the question
Number  [conditional] firstNumber  // First number in the question
String  [conditional] operator     // The operator
Number  [conditional] secondNumber // Second number in the question
Boolean [optional]    allowUpdate  // True if you want your request to update records if they exist already
```
You can choose to provide a full question string, or the combination of firstNumber, secondNumber, and operator

Questions are validated to make sure that the necessary parameters are present, and the data is appropriate (the answer is correct for the given numbers and operator).

#### PUT - update questions

Available url formats:
```
PUT /questions/[escaped full question string]
PUT /questions/first/[firstNumber]/operator/[operator]/second/[secondNumber]
```
Form data:
```
String [conditional] question     // Full question string
Number [required]    answer       // Answer to the question
Array  [required]    distractors  // Array of wrong answer(s) to the question
Number [conditional] firstNumber  // First number in the question
String [conditional] operator     // The operator
Number [conditional] secondNumber // Second number in the question
```
You can choose to provide a full question string, or the combination of firstNumber, secondNumber, and operator

Updates are validated to make sure that the necessary parameters are present, and the data is appropriate (the answer is correct for the given numbers and operator).

#### DELETE - remove records of a question

Available url formats:
```
DELETE /questions/[escaped full question string]
DELETE /questions/first/[firstNumber]/operator/[operator]/second/[secondNumber]
```

NOTE: Deleting questions that have been imported from the import questions file will not make permanent changes, because those questions will be re-imported when/if the server is restarted.

## Importing

The server can open a text file on disk, and import questions into the database. 

#### Setup

Edit the contents of questions.csv to contain the questions you want.

NOTE: Questions will be imported on server startup, and changes on imported questions will be overwritten

#### Interpreter

Questions are imported using a class called [Interpreter](https://github.com/ZECTBynmo/riddler/blob/master/src/interpreter.js). A question file line is built like this:
```
[question string]|[answer]|[distractors]
```

A question string is parsed into component parts like so:
```
What is [firstNumber] [operator] [secondNumber]?
```
Distractors are a list of comma separated numbers.

NOTE: The importer streams data from the questions file, so it can theoretically handle very large file sizes.

## Unit/Integration Tests

Many aspects of the server are covered by unit tests
```
Importer
    #parseLine()
      ✓ should parse a single line of a questions file 
      ✓ should have all expected data 
      ✓ should turn numerical data into Numbers 
    #eachLine()
      ✓ should open a file and iterate over its lines
      
      
Server
    #run()
      ✓ should start up the server
      ✓ should return the current count of questions
      ✓ should fetch a question
      ✓ should create a question
      ✓ should update a question
```
