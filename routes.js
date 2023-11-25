var http = require('http');
const fs = require('fs');
const Helpers = require(`${__dirname}/Helpers/helpers`);
const Task = require(`${__dirname}/Classes/Task`);

let timeIdled = 0;
const databaseFile = `${__dirname}/db.json`
let dbCSV = '';
let dbJson = [];

// Load DB from disk
// fs.readFile(databaseFile, (err, inputD) => {
//   if (err) throw err;
//   dbJson = JSON.parse(inputD.toString()).map(task => {
//     return new Task(task);
//   });
// });
readLocalDB(() => {});

async function readLocalDB(callback) {
  fs.readFile(databaseFile, (err, inputD) => {
    if (err) throw err;
    dbJson = JSON.parse(inputD.toString()).map(task => {
      return new Task(task);
    });
    callback(dbJson);
  });
}

// Create server
var server = http.createServer(function(request, response) {
  const url = new URL(`http://127.0.0.1:8080${request.url}`);
  var path = url.pathname;

  //
  // Routes
  //
  const routes = [
    {
      path: 'time',
      callback: () => {
        response.write(`${timeIdled}`);
        response.end();
      }
    },
    {
      path: 'resetIdle',
      callback: () => {
        timeIdled = 0;
        response.write(`${timeIdled}`);
        response.end();
      }
    },
    {
      path: 'resetEvents',
      callback: () => {
        dbJson = dbJson.map(e => {
          e.events = [];
          return e;
        });
        fs.writeFile(databaseFile, JSON.stringify(dbJson), (err) => {
          if (err)
            console.log(err);
          else {
            console.log("File written successfully\n");
          }
        });
      }
    },
    {
      path: 'resetCompletion',
      callback: () => {
        dbJson = dbJson.map(e => {
          e.status = '';
          return e;
        });
        fs.writeFile(databaseFile, JSON.stringify(dbJson), (err) => {
          if (err)
            console.log(err);
          else {
            console.log("File written successfully\n");
          }
        });
      }
    },
    {
      path: 'db',
      callback: () => {
        // fs.readFile(databaseFile, (err, inputD) => {
        //   if (err) throw err;
        //   dbJson = JSON.parse(inputD.toString());
        //   dbJson = dbJson.map(task => {
        //     return new Task(task);
        //   });
        //   console.log(`${JSON.stringify(dbJson)}`);
        //   response.write(`${JSON.stringify(dbJson)}`);
        //   response.end();
        // });
        readLocalDB(result => {
          console.log(`${JSON.stringify(result)}`);
          response.write(`${JSON.stringify(result)}`);
          response.end();
        });
      }
    },
    {
      path: 'task_action',
      callback: () => {
        var id = url.searchParams.get('id');
        var action = url.searchParams.get('action');
        var taskIndex = dbJson.findIndex((element) => element.id == id);
        dbJson[taskIndex].events ? dbJson[taskIndex].events.push({type: action, timestamp: getCurrentTime()})
          : dbJson[taskIndex].events = [{type: action, timestamp: getCurrentTime()}];
        fs.writeFile(databaseFile, JSON.stringify(dbJson), (err) => {
          if (err)
            console.log(err);
          else {
            console.log("File written successfully\n");
          }
        });
      }
    },
    {
      path: 'remove_task',
      callback: () => {
        var id = url.searchParams.get('id');
        var taskIndex = dbJson.findIndex((element) => element.id == id);
        const newDbJson = dbJson.filter(e => Number(e.id) != taskIndex); // FIXME:
        fs.writeFile(databaseFile, JSON.stringify(newDbJson), (err) => {
          if (err)
            console.log(err);
          else {
            console.log("File written successfully\n");
          }
        });
      }
    },
    {
      path: 'edit_task',
      callback: () => {
        // FIXME: const helper = new Helpers;
        //const taskObj = csvToArr(dbCSV, ',');

        var id = url.searchParams.get('id');  // ID,Name,Status,Type,When
        var action = url.searchParams.get('action');

        const params = Object.fromEntries(url.searchParams);
        delete params.action;

        console.log('params', params);

        var taskIndex = dbJson.findIndex((element) => element.id == id); // TODO: number == string
        const is_new = taskIndex === -1;
        if (is_new) taskIndex = Number(params.id);
        dbJson[taskIndex] = {...dbJson[taskIndex], ...params}; // Merge curr task with task data from url

        let events = dbJson[taskIndex].events || [];
        if (typeof events === 'string') events = JSON.parse(events);

        // Converts old data, should be removed at some point
        let when = dbJson[taskIndex].when || [];
        if (typeof when === 'string') when = JSON.parse(when);
        dbJson[taskIndex].when = when;

        let subtype = '';
        let actionParsed = '';
        try {
          let actionJson = JSON.parse(action);
          actionParsed = actionJson.type;
          subtype = actionJson.subtype;
        } catch {
          actionParsed = action;
        }

        dbJson[taskIndex].events = is_new ? [{type: 'created', subtype: subtype, timestamp: getCurrentTime()}]
          : [...events, {type: actionParsed, subtype: subtype, timestamp: getCurrentTime()}];

        dbJson[taskIndex].when = calculateCertaintyScores(dbJson[taskIndex]);

        // if (actionParsed === 'completed' && dbJson[taskIndex].refresh_time) {
        //   dbJson[taskIndex].next_time = getCurrentTime() + Number(dbJson[taskIndex].refresh_time);
        // }

        fs.writeFile(databaseFile, JSON.stringify(dbJson), (err) => {
          if (err) {
            console.log(err);
            response.write('error');
          } else {
            console.log("File written successfully\n");
            response.write('success');
          }
          response.end();
        });
      }
    }
  ];
    // Page routes
    fs.readFile(__dirname + path, function(error, data) {
      if (error) {
        // Check API Routes
        const route = routes.find(r => {
          if (path === `/${r.path}`) {
            return r;
          }
        });
        if (route) {
          route.callback();
        } else {
          response.writeHead(404);
          response.write('This page does not exist');
          response.end();
        }
      } else {
        response.writeHead(200, {
          'Content-Type': 'text/html'
        });
        response.write(data);
        response.end();
      }
    });

});
server.listen(8080);

//
// Timers
//
setInterval(e => { // Will need client side detection, unless tracking api usage, aka all buttons and interactions go thru the api
  // if no action from user..
  timeIdled++;
}, 1000);

//
// Helpers
//
function calculateCertaintyScores(task) {
  const totalThresholds = [{ count: 0, weight: 0 }, { count: 5, weight: .10 }, { count: 10, weight: .20}, { count: 15, weight: .30}, { count: 20, weight: .40}];
  let scores = {};
  let link;
  for (var i = task.events.length - 1; i >= 0; i--) {
    const event = task.events[i];
    if (link && link.subtype === event.type) {
      // We found the link
      scores[event.type] = scores[event.type] || {};
      scores[event.type][link.type] = (scores[event.type] && scores[event.type][link.type] || 0) + 1;
      scores[event.type]['total'] = (scores[event.type] && scores[event.type]['total'] || 0) + 1;
      link = null;
    }

    if (event.type === 'completed' || event.type === 'canceled') {
      link = event;
    }
  }

  for (type in scores) {
    const diff = (scores[type].completed || 0) - (scores[type].canceled || 0);
    scores[type].certainty = (diff > 0 ? diff : 0) / scores[type].total || 0;
  }

  console.log('scores: ', scores);

  task.when = task.when.map(when => { // TODO: If a score does not exist within the when object, add it
    const propEnding = ['morning', 'afternoon', 'evening'].includes(when.when) ? `TimeOfDay${when.when.charAt(0).toUpperCase() + when.when.slice(1)}` : when.when;
    let lookup = scores[`suggested${propEnding.charAt(0).toUpperCase() + propEnding.slice(1)}`];
    when.certainty = lookup && lookup.certainty || 0;
    totalThresholds.forEach(e => {
      if (lookup && lookup.total || 0 >= e.count) when.weight = e.weight;
    });
    return when;
  });

  console.log('task.when', task.when);

  return task.when;
}
function getCurrentTime() {
  const date = new Date();
  return date.getTime();
}
function csvToArr(stringVal, splitter) {
  const [keys, ...rest] = stringVal
    .trim()
    .split("\n")
    .map((item) => item.split(splitter));

  const formedArr = rest.map((item) => {
    const object = {};
    keys.forEach((key, index) => (object[key] = item.at(index)));
    return object;
  });
  return formedArr;
}
function arrayToCSV(data) {
  const csv = [];

  // Get the headers from the first object in the array
  const headers = Object.keys(data[0]);
  csv.push(headers.join(','));

  // Loop through the array and convert each object to a CSV line
  data.forEach(obj => {
    const line = headers.map(header => obj[header]).join(',');
    csv.push(line);
  });

  // Join the array of CSV lines with line breaks
  return csv.join('\n');
}