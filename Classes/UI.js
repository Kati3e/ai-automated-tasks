class UI {
  constructor(document, settings) {
    // setup query selectors
    this.chat = {
      output: document.querySelector('div.chat'),
      input: document.querySelector('div.inputArea')
    };
  }

  addChatBubble(text, choices, extra) { // split into two, chatbubble with tasks, chatbubble with options (done, cancel, etc)
    const id = extra && extra.id ? extra.id : '';
    const classname = extra && extra.class ? extra.class : 'taskList';

    this.chat.outputinnerHTML += `
      <div id="task${id}" class="chat ${classname}">
        <div class="text">${text}</div>
        ${choices && choices.length ? `<div class="choices">${choiceHTML(choices)}</div>` : ''}
      </div>`;
  }

  button(data) {
    const id = data.id;
    const name = data.name;

    return `<button id='task${id}' class='task' onClick='selectionMade(this, ${JSON.stringify(data)})'>${name}</button>`
  }

  choiceHTML(choices) {
    return choices && choices.map(choice => `<div class="choiceButton">${button(choice)}</div>`).join('') || ""
  }
  //TM POSE
  // Header bar
  // chat input
  // admin page
    // header bar
    // task selection dropdown
    // form
  // needs progress bars

}

// module.exports = UI;