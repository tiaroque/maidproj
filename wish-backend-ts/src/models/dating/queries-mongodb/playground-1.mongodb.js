/* global use, db */
// MongoDB Playground
// To disable this template go to Settings | MongoDB | Use Default Template For Playground.
// Make sure you are connected to enable completions and to be able to run a playground.
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.
// The result of the last command run in a playground is shown on the results panel.
// By default the first 20 documents will be returned with a cursor.
// Use 'console.log()' to print to the debug output.
// For more documentation on playgrounds please refer to
// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

// Select the database to use.
use("maiditt");
db.users.find();

db.users.aggregate([
  {
    $match: {
      $expr: {
        $ne: [
          {
            $size: {
              $ifNull: [
                {
                  $filter: {
                    input: "$languages",
                    as: "language",
                    cond: {
                      $in: ["$$language", ["german", "chinese", "english"]],
                    },
                  },
                },
                ["all"],
              ],
            },
          },
          0,
        ],
      },
    },
  },
  {
    $addFields: {
      age: {
        $dateDiff: { startDate: "$birthDate", endDate: "$$NOW", unit: "year" },
      },
    },
  },
  {
    $match: {
      age: {
        $gte: 18,
        $lte: 61,
      },
    },
  },
]);
