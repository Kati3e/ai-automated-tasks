// TODO:
// Add attempts or failures for tasks, aka task repeating
// Make it a main goal to get auto live working
// Setup more IDE features
// Event system
// Finish enter
// Add mute and hide buttons on webcam
// Fix suggestion box layout
// Add TTS
// Document sooner
// Refactor into more scripts
// Detect time of day and sort tasks by that order "when" (for now by default)
// Add task rewards, for completing a task
// Fill out XP bar as tasks are finished, have levels, etc.
//

// import { Task } from '/Classes/Task.js';
// import UI from '/Classes/UI.js';

const types = ['Physical'];
const whens = []; // Needing, Having, Feeling, Wanting, Idle..
const status = ['Not Started', 'In Progress', 'Complete'];
const eventQue = []; // TODO: Change over to an event base approach
const skipCertainty = true;

let timeIdled = 0;
let timeTillIdleTask = 60;
let taskArr = [];
let timeOfDay = '';
let lastTimeOfDay = getTimeOfDay();

let UIHelpers;

document.addEventListener("DOMContentLoaded", () => {
  UIHelpers = new UI(document);
  const input = document.querySelector(".inputArea .input input");
  input.addEventListener("input", valueUpdated);
  fetch('http://127.0.0.1:8080/resetIdle', {
    method: "GET"
  })
  .then((response) => response.text())
  .then((text) => {});

  fetch('http://127.0.0.1:8080/db', {
    method: "GET"
  })
  .then((response) => response.text())
  .then((text) => {
    updateTasks(text.toString());
    // JSON.parse(text.toString()).forEach(e => {
    //   taskArr.push(new Task(e));
    // })
    updateChat();
    updateTimeOfDayTasks(getTimeOfDay(), true);
  });
});

//
// Callbacks
//
function updateTasks(text) { // FIXME: Why..
  taskArr = JSON.parse(text);
}
async function updateTimeOfDayTasks(currTimeOfDay, skipNotification) {
  if (!currTimeOfDay) currTimeOfDay = timeOfDay;
  const timeOfDayTasks = taskArr.filter(task => {
    const when = task.when || [];
    if (task.status === 'done') return false;
    if (!skipCertainty) return when.filter(w => w.when === currTimeOfDay && w.certainty >= w.weight).length; // && w.certainty > 50); // TODO: && certainty > 50 | when: {id:0,certainty:5,when:morning}
    return true;
  })
  if (!skipNotification) sendNotification(`Good ${currTimeOfDay}!`, 'Please consider completing a task.');

  if (!timeOfDayTasks.length) return;
  const tasks = timeOfDayTasks.map(e => {
    return { id: e.id, name: e.name, task: e }
  });
  UIHelpers.addChatBubble({
    type: 'tasks',
    text: `Here are some tasks for ${currTimeOfDay}:`,
    tasks: tasks,
    classname: `suggestedTimeOfDay${currTimeOfDay.charAt(0).toUpperCase() + currTimeOfDay.slice(1)}`
  });

  // if (timeOfDayTasks.length > 5) { // FIXME: Make this default css
  //   const choicesDiv = chatDiv.querySelector('.choices [class*=suggestedTimeOfDayMorning]');
  //   choicesDiv.style = 'display: flex;flex-wrap: wrap;width: 640px;';
  // }

  const promises = timeOfDayTasks.map(task => // FIXME:
    fetch(`http://127.0.0.1:8080/edit_task?id=${task.id}&action=suggestedTimeOfDay${currTimeOfDay.charAt(0).toUpperCase() + currTimeOfDay.slice(1)}`, {
      method: 'GET'
  }));
  const response = await Promise.all(promises);
  console.log('response', response);
}
function updateChat() {
  const uncompletedTasks = taskArr.filter(task => task.status !== 'done');
  UIHelpers.addChatBubble({ type: 'tasks', text: 'Here are the uncompleted tasks I know about:', tasks: uncompletedTasks});

  // if (uncompletedTasks.length > 5) { // FIXME: Make this default css
  //   const choicesDiv = chatDiv.querySelector('.choices');
  //   choicesDiv.style = 'display: flex;flex-wrap: wrap;width: 640px;';
  // }
}
function valueUpdated(e) { // FIXME: Needs reworking
  // TODO: When enter is used and no suggestions are available integrate into an AI model
  const val = e.target.value;
  // Lookup feeling in tasks
  const tasks = [];
  if (val) taskArr.forEach(task => {
    if (task.status !== 'done' && (task.name.includes(val)  || task.type.includes(val) || task.when.filter(w => w.when === val))) { //.includes(val))) { // FIXME:
      tasks.push(task);
    }
  });
  if (tasks.length !== 0) {
    const chatDiv = document.querySelector("div.chat");
    let suggestions = document.querySelector('.chat .suggest');
    if (!suggestions) {
      chatDiv.innerHTML += `<div class="bubble suggest"></div>`;
      suggestions = document.querySelector('.chat .suggest');
    }
    suggestions.innerHTML = UIHelpers.addChatBubble({type: 'tasks', text: 'May I suggest:', tasks: tasks}); // Search
    chatDiv.appendChild(suggestions);
  } else { // No tasks, clear list
    let suggestions = document.querySelector('.chat .suggest');
    if (suggestions) suggestions.innerHTML = "";
  }
}

// Button click
//
// TODO: Make sure another bubble isn't already available for display
//
function selectionMade(element, choice) { // TODO: Refactor
  //const choice = JSON.parse(choiceJson);
  const taskID = choice && choice.task && choice.task.id;
  const taskName = choice && choice.task && choice.task.name;
  const taskAttempted = choice && choice.task && choice.task.attempted;
  const selectedChoiceName = choice.name;
  const selectedChoiceID = choice.id;

  const chatDiv = document.querySelector("div.chat");

  let suggestedClass = '';
  const suggestedClassList = element.closest('.chat') && element.closest('.chat').classList || [];
  suggestedClassList.forEach(e => {
    if (e.includes('suggested')) {
      suggestedClass = e;
    }
  });

  if (selectedChoiceName === 'Done') {
    taskArr.forEach(task => {
      if (task.id === selectedChoiceID) {
        task.status = 'done';

        fetch(`http://127.0.0.1:8080/edit_task?id=${task.id}&status=${task.status}&action={"type":"completed","subtype":"${suggestedClass}"}`, {
          method: "GET"
        })
        .then((response) => console.log(response.text()));

        allTaskButtons = document.querySelectorAll(`button.task#task${task.id}`);
        allTaskButtons.forEach(button => {
          button.disabled = true;
          const bubble = button.closest('.bubble.suggest');
          if (bubble) {
            const buttons = bubble.querySelectorAll('button');
            const filterButtons = buttons && Array.from(buttons).filter(button => !button.disabled);
            filterButtons.length < 1 ? bubble.style.display = 'none' : '';
          }
        });
      }
    });
    // TODO: Really this should be an event we can fire (task completed, everything listening to that task gets updated)
    const parentElement = element.parentElement.parentElement;
    const buttons = parentElement.querySelectorAll('button');
    element.disabled = true;
    buttons.forEach(button => {
      if (button !== element) {
        button.remove();
      }
    });

    UIHelpers.addChatBubble({ type: 'options', text: `Alright, I have marked, "${taskName}", as done.`, options: [], classname: 'done', id: taskID }); // TODO: Trigger AI
  } else if (selectedChoiceName === 'Cancel') {
    // Send a counter to keep track of the number of times retired
    fetch(`http://127.0.0.1:8080/edit_task?id=${taskID}&action={"type":"canceled","subtype":"${suggestedClass}"}`, {
      method: "GET"
    })
    .then((response) => console.log(response.text()));

    const parentElement = element.parentElement.parentElement;
    // Add completion class to parent level for use in multi selection of tasks
    parentElement.classList.add('canceled');
    const buttons = parentElement.querySelectorAll('button');
    element.disabled = true;
    buttons.forEach(button => {
      if (button !== element) {
        button.remove();
      }
    });
    UIHelpers.addChatBubble({ type: 'options', text: `Alright, the task, "${taskName}", has been put on hold for now.`, options: [], classname: 'cancel', id: taskID });
  } else { // Task button selected
    fetch(`http://127.0.0.1:8080/edit_task?id=${selectedChoiceID}&action={"type":"selected","subtype":"${suggestedClass}"}`, {
      method: "GET"
    })
    .then((response) => console.log(response.text()));

    const bubbleElement = chatDiv.querySelector(`.bubble.waiting#task${selectedChoiceID}`);
    if (bubbleElement === null) {
      UIHelpers.addChatBubble({
        type: 'options',
        text: `Alright, I'll be awaiting your completion on, "${selectedChoiceName}"`,
        options: [{id: choice.id, name: 'Done', task: choice}, {id: choice.id, name: 'Cancel', task: choice}],
        classname: `waiting ${suggestedClass}`,
        id: selectedChoiceID
      });
    } else {
      if (bubbleElement.querySelector('.canceled')) {
        UIHelpers.addChatBubble({
          type: 'options',
          text: `Alright, I'll be awaiting your completion on, "${selectedChoiceName}"`,
          options: [{name: 'Done', task: choice}, {name: 'Cancel', task: choice}],
          classname: `waiting ${suggestedClass}`,
          id: selectedChoiceID
        });
      }
    }
  }
}

//
// Helpers
//
function getTimeOfDay(cap) {
  var today = new Date();
  var curHr = today.getHours();

  if (curHr < 12) {
    return cap ? 'Morning' : 'morning';
  } else if (curHr < 18) {
    return cap ? 'Afternoon' : 'afternoon';
  } else {
    return cap ? 'Evening' : 'evening';
  }
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
function sendNotification(title, body, link, icon) {
  if (Notification.permission !== 'granted')
    Notification.requestPermission();
  else {
    var notification = new Notification(title, {
      icon: icon,
      body: body,
    });
    notification.onclick = function() {
      if (!link) window.focus();
      else window.open(link);
    };
  }
}

//
// Timers
//
setInterval(() => {
  const currTimeOfDay = getTimeOfDay();
  if (timeOfDay != currTimeOfDay) {
    timeOfDay = currTimeOfDay;
    if (lastTimeOfDay !== currTimeOfDay) {
      updateTimeOfDayTasks();
      lastTimeOfDay = currTimeOfDay;
    }
  }

  if (timeTillIdleTask <= 0) { // TODO: Start work on event system
    console.log('timeTillIdleTask is now 0');
    timeTillIdleTask = 60;
    // TODO: trigger event to pick an idle task, causing printout in chat, etc.
    fetch('http://127.0.0.1:8080/db', {
      method: "GET"
    })
    .then((response) => response.text())
    .then((text) => {
      let filteredTasks;
      const parsedTasks = JSON.parse(text.toString());
      if (skipCertainty) {
        filteredTasks = parsedTasks;
      } else {
        filteredTasks = parsedTasks.filter(task => {
          return task.when.filter(w => w.when === 'idled' && w.certainty >= w.weight).length; // TODO: Add certainty score
        });
      }
      const randFilteredTask = filteredTasks[Math.floor(Math.random() * filteredTasks.length)];
      if (randFilteredTask) {
        const chatIdledBubble = document.querySelector("div.chat .chat.bubble.waiting.suggestedIdled");
        const chatDiv = document.querySelector("div.chat");

        const idleBubble = UIHelpers.getChatBubble({
          type: 'options',
          text: `You've been idled for, ${timeIdled}s, may I recommend this task, "${randFilteredTask.name}"`,
          options: [{name: 'Done', task: randFilteredTask}, {name: 'Cancel', task: randFilteredTask}],
          classname: 'waiting suggestedIdled',
          id: randFilteredTask.id
        });

        if (chatIdledBubble) {
          chatIdledBubble.outerHTML = idleBubble;
        } else {
          chatDiv.innerHTML += idleBubble
        }

        fetch(`http://127.0.0.1:8080/edit_task?id=${randFilteredTask.id}&action=suggestedIdled`, {
          method: "GET"
        })
        .then((response) => console.log('edit_task response: ', response.text()))
        // .then((json) => console.log(json));
      }
    });
  }
  fetch('http://127.0.0.1:8080/time', {
    method: "GET"
  })
  .then((response) => response.json())
  .then((json) => {
    console.log(`timeIdled: ${json} | ${timeIdled} | ${timeTillIdleTask}`);
    timeTillIdleTask = timeTillIdleTask - (json - timeIdled);
    timeIdled = json;
  });
}, 1000);

//
// TMPose Code
//
const path = `./Pose/my_model/`;
let model, webcam, ctx, labelContainer, maxPredictions;
const brat = new Audio(path + 'brat.mp3');
const hello = new Audio(path + 'hello.mp3');

async function end() {
  webcam.stop();
  const panel = document.querySelector(".posePanelWebcam");
  panel.style.display = 'none';
}

async function init() {
  const modelURL = path + "model.json";
  const metadataURL = path + "metadata.json";
  const panel = document.querySelector(".posePanelWebcam");
  panel.style.display = 'flex';

  // load the model and metadata
  // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
  // Note: the pose library adds a tmPose object to your window (window.tmPose)
  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // Convenience function to setup a webcam
  const size = 200;
  const flip = false; // whether to flip the webcam
  webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
  await webcam.setup(); // request access to the webcam
  await webcam.play();
  window.requestAnimationFrame(loop);

  // append/get elements to the DOM
  const canvas = document.getElementById("canvas");
  canvas.style.display = "initial";
  canvas.width = size; canvas.height = size;
  ctx = canvas.getContext("2d");
  labelContainer = document.getElementById("label-container");
  for (let i = 0; i < maxPredictions; i++) { // and class labels
      labelContainer.appendChild(document.createElement("div"));
  }
}

async function loop(timestamp) {
  webcam.update(); // update the webcam frame
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  // Prediction #1: run input through posenet
  // estimatePose can take in an image, video or canvas html element
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  // Prediction 2: run input through teachable machine classification model
  const prediction = await model.predict(posenetOutput);

  for (let i = 0; i < maxPredictions; i++) {
      const classPrediction =
          prediction[i].className + ": " + prediction[i].probability.toFixed(2);
      labelContainer.childNodes[i].innerHTML = classPrediction;
if (pose && prediction[i].className === 'brat' && prediction[i].probability.toFixed(2) >= 1.00) {
  brat.play();
} else if (pose && prediction[i].className === 'hello' && prediction[i].probability.toFixed(2) >= 1.00) {
  hello.play();
}
  }

  // finally draw the poses
  drawPose(pose);
}

function drawPose(pose) {
  if (webcam.canvas) {
      ctx.drawImage(webcam.canvas, 0, 0);
      // draw the keypoints and skeleton
      if (pose) {
          const minPartConfidence = 0.5;
          tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
          tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
      }
  }
}

// local LLM API
//
const HOST = 'localhost:5000';
const URI = `http://${HOST}/api/v1/generate`;
function postRequest(prompt) { // To local LLM
  request = {
    'prompt': prompt,
    'max_new_tokens': 250,
    'auto_max_new_tokens': false,
    'max_tokens_second': 0,
    // Generation params. If 'preset' is set to different than 'None', the values
    // in presets/preset-name.yaml are used instead of the individual numbers.
    'preset': 'None',
    'do_sample': true,
    'temperature': 0.7,
    'top_p': 0.1,
    'typical_p': 1,
    'epsilon_cutoff': 0,  // In units of 1e-4
    'eta_cutoff': 0,  // In units of 1e-4
    'tfs': 1,
    'top_a': 0,
    'repetition_penalty': 1.18,
    'repetition_penalty_range': 0,
    'top_k': 40,
    'min_length': 0,
    'no_repeat_ngram_size': 0,
    'num_beams': 1,
    'penalty_alpha': 0,
    'length_penalty': 1,
    'early_stopping': false,
    'mirostat_mode': 0,
    'mirostat_tau': 5,
    'mirostat_eta': 0.1,
    'grammar_string': '',
    'guidance_scale': 1,
    'negative_prompt': '',

    'seed': -1,
    'add_bos_token': true,
    'truncation_length': 2048,
    'ban_eos_token': false,
    'custom_token_bans': '',
    'skip_special_tokens': true,
    'stopping_strings': []
  }

  fetch(URI, {
    method: "POST",
    body: JSON.stringify(request),
    // headers: {
    //   "Content-type": "application/json; charset=UTF-8"
    // }
  })
  .then((response) => response.json())
  .then((json) => console.log(json));
}