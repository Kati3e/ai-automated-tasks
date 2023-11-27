class UI {
  constructor(document, settings) {
    // setup query selectors
    this.chat = {
      output: document.querySelector('div.chat'),
      input: document.querySelector('div.inputArea')
    };
  }

  // split into two, chatbubble with tasks, chatbubble with options (done, cancel, etc)
  // context: {type: 'tasks', tasks: []} || {type: 'options', options []} // FIXME: Left off
  addChatBubble(context, extra) {
    this.chat.output.innerHTML += this.getChatBubble(context, extra);
  }
  getChatBubble(context, extra) {
    const id = context.id || 0;
    const text = context.text;
    let classname, tasks, options;
    if (context.type === 'tasks') { // [{!id:}]
      tasks = context.tasks;
      classname = 'taskList';
    }
    if (context.type === 'options') { // [id:]
      options = context.options;
      classname = 'bubble'; // Rename to 'optionList'
    }

    const buttons = options || tasks;

    return `
      <div id="task${id}" class="chat ${classname}">
        <div class="text">${text}</div>
        ${buttons && buttons.length ? `<div class="choices">${optionsButtons(buttons)}</div>` : ''}
      </div>`;


    function optionsButtons(buttons) {
      return buttons && buttons.map(button => {
        return `<div class="choiceButton"><button id='task${context.type === 'options' ? button.task.id : button.id}' class='task' onClick='selectionMade(this, ${JSON.stringify(button)})'>${button.name}</button></div>`;
      }).join('') || "";
    }
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