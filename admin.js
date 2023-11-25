let db = [];
const newProps = ['events'];
const orderedProps = ['id', 'name', 'type', 'status', 'refresh_time', 'notes', 'when', 'events'];

document.addEventListener("DOMContentLoaded", () => {
  const select = document.querySelector('.taskSelect select');
  select.addEventListener("change", taskSelected);

  fetch('http://127.0.0.1:8080/db', {
    method: "GET"
  })
  .then((response) => response.text())
  .then((text) => {
    db = JSON.parse(text.toString());
    db.forEach(e => {
      var opt = document.createElement('option');
      opt.value = e.id;
      opt.innerHTML = e.name;
      select.appendChild(opt);
    });
  });
});

function formSubmit(event) {
  const newTaskValues = {};
  event.preventDefault();
  event.target.childNodes.forEach(e => {
    let property, value;
    if (e.classList.contains('edit')) {
      const inputs = e.querySelectorAll('input');
      property = inputs[0].value;
      value = inputs[1].value;
    } else {
      const input = e.querySelector('input') || e.querySelector('textarea');
      property = input.name;
      value = input.value;
    }
    if (property) newTaskValues[property] = value;
  });
  console.log('newTaskValues', newTaskValues);

  const u = new URLSearchParams(newTaskValues).toString();

  fetch(`http://127.0.0.1:8080/edit_task?action=edited&${u}`, {
    method: "GET"
  })
  .then(response => response.text())
  .then(text => console.log(text))
}

function removeTask() {
  const idInput = document.querySelector('.form form .field input[name="id"]');
  const selectedTaskId = idInput.value;
  fetch(`http://127.0.0.1:8080/remove_task?id=${selectedTaskId}`, {
    method: "GET"
  })
  .then((response) => response.json())
  .then((json) => console.log(json));
}

function addTask() {
  const newTaskValues = {};
  const selectedTask = db[db.length - 1];
  const form = document.querySelector('.form form');
  form.innerHTML = ''; // FIXME: Not ideal
  form.addEventListener("submit", (event) => { // FIXME: Needs merged
    event.target.childNodes.forEach(e => {
      const input = e.querySelector('input') || e.querySelector('textarea');
      const property = input.name;
      const value = input.value;
      if (property) newTaskValues[property] = value;
    });
    console.log('newTaskValues', newTaskValues);

    const u = new URLSearchParams(newTaskValues).toString();

    fetch(`http://127.0.0.1:8080/edit_task?action=created&${u}`, {
      method: "GET"
    })
    .then(response => response.text())
    .then(text => console.log(text));
  });

  [...new Set([...orderedProps, ...Object.keys(selectedTask)])].forEach(property => {
    let inputText;
    const needsTextarea = ['when', 'events', 'notes'].includes(property);

    if (needsTextarea) {
      inputText = document.createElement('textarea');
      inputText.type = 'textarea';
      inputText.setAttribute('rows', '4');
      inputText.name = property
      inputText.value = property === 'id' ? Number(selectedTask[property]) + 1 : '';
    } else {
      inputText = document.createElement('input');
      inputText.type = 'text';
      inputText.name = property
      inputText.value = property === 'id' ? Number(selectedTask[property]) + 1 : '';
    }

    const divField = document.createElement('div');
    const divLabel = document.createElement('div');
    divLabel.innerHTML = `${property}: `;
    divLabel.className = 'fieldLabel';
    divField.className = 'field';
    divField.appendChild(divLabel) ;
    divField.appendChild(inputText);
    form.appendChild(divField);
  });
  const divButton = document.createElement('div');
  divButton.className = 'formButton';
  const formSave = document.createElement('input');
  formSave.className = 'formSave';
  formSave.type = 'submit';
  formSave.value = 'Save';
  const formAddProp = document.createElement('button');
  formAddProp.type = 'button';
  formAddProp.className = 'formAddProp';
  formAddProp.onclick = addFormProp;
  formAddProp.innerHTML = 'Add Prop';
  divButton.appendChild(formAddProp);
  divButton.appendChild(formSave);
  form.appendChild(divButton);
}

function taskSelected(e) {
  const newTaskValues = {};
  const selectedTaskId = e.target.value;
  const selectedTask = db[selectedTaskId];
  const form = document.querySelector('.form form');
  form.innerHTML = ''; // FIXME: Not ideal

  [...new Set([...orderedProps, ...Object.keys(selectedTask)])].forEach(property => {
    const divField = document.createElement('div');
    const divLabel = document.createElement('div');
    divLabel.innerHTML = `${property}: `;
    divLabel.className = 'fieldLabel';

    let inputText;

    const needsTextarea = ['when', 'events', 'notes'].includes(property);

    if (needsTextarea) {
      inputText = document.createElement('textarea');
      inputText.type = 'textarea';
      inputText.setAttribute('rows', '4');
      inputText.name = property
      inputText.value = typeof selectedTask[property] === 'object' ? JSON.stringify(selectedTask[property]) : selectedTask[property];
    } else {
      inputText = document.createElement('input');
      inputText.type = 'text';
      inputText.name = property
      inputText.value = typeof selectedTask[property] === 'object' ? JSON.stringify(selectedTask[property]) : selectedTask[property];
    }

    divField.className = 'field';
    divField.appendChild(divLabel) ;
    divField.appendChild(inputText);
    form.appendChild(divField);
  });
  const divButton = document.createElement('div');
  divButton.className = 'formButton';
  const formSave = document.createElement('input');
  formSave.className = 'formSave';
  formSave.type = 'submit';
  formSave.value = 'Save';
  const formAddProp = document.createElement('button');
  formAddProp.type = 'button';
  formAddProp.className = 'formAddProp';
  formAddProp.onclick = addFormProp;
  formAddProp.innerHTML = 'Add Prop';
  divButton.appendChild(formAddProp);
  divButton.appendChild(formSave);
  form.appendChild(divButton);
}

function resetCompletion() {
    fetch(`http://127.0.0.1:8080/resetCompletion`, {
      method: "GET"
    })
    .then((response) => response.json())
    .then((json) => console.log(json));
}
function resetEvents() {
  fetch(`http://127.0.0.1:8080/resetEvents`, {
    method: "GET"
  })
  .then((response) => response.json())
  .then((json) => console.log(json));
}
function addFormProp() {
  const fields = document.querySelectorAll('.field');
  const fieldDiv = document.createElement('div');
  fieldDiv.classList.add('field', 'edit');
  const prop = document.createElement('input');
  const value = document.createElement('input');
  fieldDiv.appendChild(prop);
  fieldDiv.appendChild(value);
  fields[fields.length - 1].after(fieldDiv);
}