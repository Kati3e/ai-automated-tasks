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

const UIHelpers = new UI();

document.addEventListener("DOMContentLoaded", () => {
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
    if (task.status === 'Done') return false;
    if (!skipCertainty) return when.filter(w => w.when === currTimeOfDay && w.certainty >= w.weight).length; // && w.certainty > 50); // TODO: && certainty > 50 | when: {id:0,certainty:5,when:morning}
    return true;
  })
  if (!skipNotification) sendNotification(`Good ${currTimeOfDay}!`, 'Please consider completing a task.');

  if (!timeOfDayTasks.length) return;
  const chatDiv = document.querySelector("div.chat");
  const choices = timeOfDayTasks.map(e => {
    return { id: e.id, name: e.name, task: e }
  });
  chatDiv.innerHTML += chatBubble(`Here are some tasks for ${currTimeOfDay}:`, choices, { class: `taskList suggestedTimeOfDay${currTimeOfDay.charAt(0).toUpperCase() + currTimeOfDay.slice(1)}` });

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
  const uncompletedTasks = taskArr.filter(task => task.status !== 'Done');
  const chatDiv = document.querySelector("div.chat");
  chatDiv.innerHTML += UIHelpers.chatBubble("Here are the uncompleted tasks I know about:", uncompletedTasks);

  // if (uncompletedTasks.length > 5) { // FIXME: Make this default css
  //   const choicesDiv = chatDiv.querySelector('.choices');
  //   choicesDiv.style = 'display: flex;flex-wrap: wrap;width: 640px;';
  // }
}
function valueUpdated(e) {
  // TODO: When enter is used and no suggestions are available integrate into an AI model
  const val = e.target.value;
  // Lookup feeling in tasks
  const tasks = [];
  if (val) taskArr.forEach(task => {
    if (task.status !== 'Done' && (task.name.includes(val)  || task.type.includes(val) || task.when.filter(w => w.when === val))) { //.includes(val))) { // FIXME:
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
    suggestions.innerHTML = chatBubble('May I suggest:', tasks);
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
        task.status = 'Done';

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

    chatDiv.innerHTML += chatBubble(`Alright, I have marked, "${taskName}", as done.`, [], { class: 'bubble done', id: taskID }); // TODO: Trigger AI
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
    chatDiv.innerHTML += chatBubble(`Alright, the task, "${taskName}", has been put on hold for now.`, [], { class: 'bubble cancel', id: taskID });
  } else { // Task button selected
    fetch(`http://127.0.0.1:8080/edit_task?id=${selectedChoiceID}&action={"type":"selected","subtype":"${suggestedClass}"}`, {
      method: "GET"
    })
    .then((response) => console.log(response.text()));

    const bubbleElement = chatDiv.querySelector(`.bubble.waiting#task${selectedChoiceID}`);
    if (bubbleElement === null) {
      chatDiv.innerHTML += UIHelpers.chatBubble(`Alright, I'll be awaiting your completion on, "${selectedChoiceName}"`, [{id: choice.id, name: 'Done', task: choice}, {id: choice.id, name: 'Cancel', task: choice}], { class: `bubble waiting ${suggestedClass}`, id: selectedChoiceID });
    } else {
      if (bubbleElement.querySelector('.canceled')) {
        chatDiv.innerHTML += UIHelpers.chatBubble(`Alright, I'll be awaiting your completion on, "${selectedChoiceName}"`, [{name: 'Done', task: choice}, {name: 'Cancel', task: choice}], { class: `bubble waiting ${suggestedClass}`, id: selectedChoiceID });
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
// UI Elements TODO: Refactor
//
const chatBubble = (text, choices, extra) => {
  return `
    <div id="task${extra && extra.id ? extra.id : ''}" class="chat ${extra && extra.class ? extra.class : 'taskList'}">
      <div class="text">${text}</div>
      ${choices && choices.length ? `<div class="choices">${choiceHTML(choices)}</div>` : ''}
    </div>`;
};
const button = data => {
  return `<button id='task${data.id}' class='task' onClick='selectionMade(this, ${JSON.stringify(data)})'>${data.name}</button>`
};
const choiceHTML = choices => choices && choices.map(choice => `<div class="choiceButton">${button(choice)}</div>`).join('') || "";

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

        const idleBubble = chatBubble(`You've been idled for, ${timeIdled}s, may I recommend this task, "${randFilteredTask.name}"`, [{name: 'Done', task: randFilteredTask}, {name: 'Cancel', task: randFilteredTask}], { class: 'bubble waiting suggestedIdled', id: task.id });

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
