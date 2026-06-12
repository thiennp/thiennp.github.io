const list = document.querySelector('#message-list');
const status = document.querySelector('#connection-status');
const messageCount = document.querySelector('#message-count');
const latestSource = document.querySelector('#latest-source');
const latestAutomation = document.querySelector('#latest-automation');
const cleanupButton = document.querySelector('#cleanup-all');
const sendCommand = document.querySelector('#send-command');
const forwardForm = document.querySelector('#forward-form');
const forwardInput = document.querySelector('#forward-target');
const forwardStatus = document.querySelector('#forward-status');
const forwardTargetList = document.querySelector('#forward-target-list');

const messages = [];
const forwardTargets = [];
const evaluatingMessageIds = new Set();
let editingMessageId = null;
let socket;
let reconnectTimer;

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function setStatus(label, className) {
  status.textContent = label;
  status.className = `connection-pill ${className || ''}`.trim();
}

function renderSendCommand() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const endpoint = `${protocol}//${window.location.host}/stream`;
  sendCommand.textContent = `AGENT_REPORT_WS=${endpoint} npm run send -- --automation-name "Daily-vulnerabilities-fix" --title "Build check" --status success "Build finished successfully"`;
}

function updateLocalMessage(updatedMessage) {
  const messageIndex = messages.findIndex((message) => message.id === updatedMessage.id);

  if (messageIndex === -1) {
    return;
  }

  messages[messageIndex] = updatedMessage;
}

function removeLocalMessage(messageId) {
  const messageIndex = messages.findIndex((message) => message.id === messageId);

  if (messageIndex === -1) {
    return;
  }

  messages.splice(messageIndex, 1);
  evaluatingMessageIds.delete(messageId);

  if (editingMessageId === messageId) {
    editingMessageId = null;
  }
}

function clearLocalMessages() {
  messages.splice(0, messages.length);
  evaluatingMessageIds.clear();
  editingMessageId = null;
}

function updateForwardTargets(nextTargets) {
  forwardTargets.splice(0, forwardTargets.length, ...nextTargets);
}

function createButton(label, className, onClick, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.disabled = Boolean(options.disabled);
  button.addEventListener('click', onClick);

  return button;
}

function sendSocketMessage(payload) {
  if (socket?.readyState !== WebSocket.OPEN) {
    setStatus('Offline', 'is-offline');
    return false;
  }

  socket.send(JSON.stringify(payload));
  return true;
}

function startEdit(messageId) {
  editingMessageId = messageId;
  render({ shouldScroll: false });
  document.querySelector(`[data-edit-input="${CSS.escape(messageId)}"]`)?.focus();
}

function cancelEdit() {
  editingMessageId = null;
  render({ shouldScroll: false });
}

function evaluateMessage(messageId) {
  if (
    sendSocketMessage({
      type: 'evaluate-message',
      id: messageId,
    })
  ) {
    evaluatingMessageIds.add(messageId);
    render({ shouldScroll: false });
  }
}

function deleteMessage(message) {
  const shouldDelete = window.confirm(`Remove this message?\n\n${message.title || message.text}`);

  if (!shouldDelete) {
    return;
  }

  deleteMessageWithoutConfirmation(message);
}

function deleteMessageWithoutConfirmation(message) {
  sendSocketMessage({
    type: 'delete-message',
    id: message.id,
  });
}

function cleanupEverything() {
  const messageLabel = messages.length === 1 ? '1 report message' : `${messages.length} report messages`;
  const shouldCleanup = window.confirm(
    `Cleanup everything?\n\nThis will remove ${messageLabel} from this page and data/messages.json. Forward targets are kept.`,
  );

  if (!shouldCleanup) {
    return;
  }

  sendSocketMessage({
    type: 'cleanup-messages',
  });
}

function saveEdit(messageId, fields) {
  const { automationInput, titleInput, statusInput, textarea } = fields;
  const text = textarea.value.trim();
  textarea.setCustomValidity('');

  if (!text) {
    textarea.setCustomValidity('Enter a message before saving.');
    textarea.reportValidity();
    textarea.focus();
    return;
  }

  sendSocketMessage({
    type: 'update',
    id: messageId,
    automationName: automationInput.value.trim(),
    title: titleInput.value.trim(),
    status: statusInput.value.trim(),
    text,
    source: 'browser',
  });
}

function getStatusTone(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!normalizedStatus) {
    return '';
  }

  if (['success', 'done', 'complete', 'completed', 'approved', 'passed', 'ok', 'clean', 'merged'].includes(normalizedStatus)) {
    return 'success';
  }

  if (['warning', 'warn', 'attention', 'partial', 'stale', 'needs-review'].includes(normalizedStatus)) {
    return 'warning';
  }

  if (['error', 'failed', 'failure', 'blocked', 'critical', 'risk', 'risky', 'vulnerable'].includes(normalizedStatus)) {
    return 'error';
  }

  if (['running', 'processing', 'in-progress', 'progress', 'active'].includes(normalizedStatus)) {
    return 'running';
  }

  if (['pending', 'todo', 'queued', 'waiting', 'hold'].includes(normalizedStatus)) {
    return 'pending';
  }

  return 'info';
}

function createStatusChip(status) {
  if (!status) {
    return null;
  }

  const chip = document.createElement('span');
  chip.className = `status-chip is-${getStatusTone(status)}`;
  chip.textContent = status;

  return chip;
}

function createMessageHeading(message) {
  if (!message.automationName && !message.title && !message.status) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'message-heading-stack';

  if (message.automationName) {
    const automation = document.createElement('div');
    automation.className = 'automation-name';
    automation.textContent = message.automationName;
    container.append(automation);
  }

  if (!message.title && !message.status) {
    return container;
  }

  const heading = document.createElement('div');
  heading.className = 'message-heading';

  if (message.title) {
    const title = document.createElement('h2');
    title.className = 'message-title';
    title.textContent = message.title;
    heading.append(title);
  }

  const statusChip = createStatusChip(message.status);

  if (statusChip) {
    heading.append(statusChip);
  }

  container.append(heading);
  return container;
}

function createEvaluationPanel(message) {
  const evaluation = message.evaluation;

  if (!evaluation && !evaluatingMessageIds.has(message.id)) {
    return null;
  }

  const panel = document.createElement('div');
  panel.className = `evaluation-panel ${evaluation?.status === 'error' ? 'is-error' : ''}`.trim();

  const title = document.createElement('div');
  title.className = 'evaluation-title';
  title.textContent =
    evaluation?.setupIssue === 'login'
      ? 'Claude login needed'
      : evaluation?.status === 'error'
        ? 'Claude setup needed'
        : 'Claude evaluation';

  const detail = document.createElement('p');
  detail.className = 'evaluation-detail';

  if (evaluatingMessageIds.has(message.id)) {
    detail.textContent = 'Claude is checking and explaining this message...';
  } else {
    detail.textContent = evaluation.explanation;
  }

  panel.append(title, detail);

  if (evaluation?.evaluatedAt) {
    const time = document.createElement('time');
    time.className = 'evaluation-time';
    time.dateTime = evaluation.evaluatedAt;
    time.textContent = `Evaluated ${formatTime(evaluation.evaluatedAt)}`;
    panel.append(time);
  }

  return panel;
}

function createMessageBody(message) {
  const body = document.createElement('div');
  body.className = 'message-body';

  if (editingMessageId === message.id) {
    const form = document.createElement('form');
    form.className = 'edit-form';

    const automationInput = document.createElement('input');
    automationInput.className = 'edit-field';
    automationInput.placeholder = 'Automation name';
    automationInput.value = message.automationName || '';

    const titleInput = document.createElement('input');
    titleInput.className = 'edit-field';
    titleInput.placeholder = 'Title';
    titleInput.value = message.title || '';

    const statusInput = document.createElement('input');
    statusInput.className = 'edit-field';
    statusInput.placeholder = 'Status: success, warning, error, running...';
    statusInput.value = message.status || '';

    const textarea = document.createElement('textarea');
    textarea.className = 'edit-input';
    textarea.dataset.editInput = message.id;
    textarea.required = true;
    textarea.rows = 3;
    textarea.value = message.text;

    const actions = document.createElement('div');
    actions.className = 'message-actions';
    actions.append(
      createButton('Cancel', 'text-button', cancelEdit),
      createButton('Save', 'primary-button', () =>
        saveEdit(message.id, {
          automationInput,
          titleInput,
          statusInput,
          textarea,
        }),
      ),
    );

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveEdit(message.id, {
        automationInput,
        titleInput,
        statusInput,
        textarea,
      });
    });

    form.append(automationInput, titleInput, statusInput, textarea, actions);
    body.append(form);

    return body;
  }

  const heading = createMessageHeading(message);

  if (heading) {
    body.append(heading);
  }

  const text = document.createElement('p');
  text.className = 'message-text';
  text.textContent = message.text;

  const actions = document.createElement('div');
  actions.className = 'message-actions';
  const primaryActions = document.createElement('div');
  primaryActions.className = 'message-actions-group';
  const quickActions = document.createElement('div');
  quickActions.className = 'message-actions-group message-actions-right';
  const isEvaluating = evaluatingMessageIds.has(message.id);
  primaryActions.append(
    createButton('Edit', 'text-button', () => startEdit(message.id)),
    createButton(
      message.evaluation ? 'Re-evaluate with Claude' : 'Evaluate with Claude',
      'text-button',
      () => evaluateMessage(message.id),
      { disabled: isEvaluating },
    ),
    createButton('Delete', 'danger-button', () => deleteMessage(message)),
  );
  quickActions.append(
    createButton('Delete without confirmation', 'danger-button danger-button-strong', () =>
      deleteMessageWithoutConfirmation(message),
    ),
  );
  actions.append(primaryActions, quickActions);

  body.append(text, actions);
  const evaluationPanel = createEvaluationPanel(message);

  if (evaluationPanel) {
    body.append(evaluationPanel);
  }

  return body;
}

function renderForwardTargets() {
  forwardStatus.textContent =
    forwardTargets.length === 0
      ? 'Forwarding is off.'
      : `Forwarding to ${forwardTargets.length} target${forwardTargets.length === 1 ? '' : 's'}.`;

  if (forwardTargets.length === 0) {
    forwardTargetList.innerHTML = '<li class="empty-forward-target">No forwarding targets yet.</li>';
    return;
  }

  forwardTargetList.replaceChildren(
    ...forwardTargets.map((target) => {
      const item = document.createElement('li');
      item.className = 'forward-target';

      const endpoint = document.createElement('code');
      endpoint.textContent = target.endpoint;

      const removeButton = createButton('Remove', 'text-button', () => {
        sendSocketMessage({
          type: 'remove-forward-target',
          id: target.id,
        });
      });

      item.append(endpoint, removeButton);
      return item;
    }),
  );
}

function render({ shouldScroll = true } = {}) {
  const latestMessage = messages.at(-1);
  messageCount.textContent = String(messages.length);
  latestSource.textContent = latestMessage?.source || '-';
  latestAutomation.textContent = latestMessage?.automationName || '-';
  cleanupButton.disabled = messages.length === 0;
  renderForwardTargets();

  if (messages.length === 0) {
    list.innerHTML = '<li class="empty-state">No messages yet.</li>';
    return;
  }

  list.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement('li');
      item.className = 'message-card';

      const meta = document.createElement('div');
      meta.className = 'message-meta';

      const source = document.createElement('span');
      source.className = 'message-source';
      source.textContent = message.source;

      const time = document.createElement('time');
      time.dateTime = message.createdAt;
      time.textContent = formatTime(message.createdAt);

      if (message.editedAt) {
        const edited = document.createElement('span');
        edited.className = 'edited-label';
        edited.textContent = `Edited ${formatTime(message.editedAt)}`;
        meta.append(source, time, edited);
      } else {
        meta.append(source, time);
      }

      if (message.forwardedFrom) {
        const forwarded = document.createElement('span');
        forwarded.className = 'forwarded-label';
        forwarded.textContent = `Forwarded from ${message.forwardedFrom}`;
        meta.append(forwarded);
      }

      item.append(meta, createMessageBody(message));

      return item;
    }),
  );

  if (shouldScroll) {
    list.scrollTop = list.scrollHeight;
  }
}

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}/stream?source=browser`);

  socket.addEventListener('open', () => {
    setStatus('Live', 'is-online');
  });

  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);

    if (payload.type === 'init') {
      messages.splice(0, messages.length, ...payload.messages);
      updateForwardTargets(payload.forwardTargets || []);
      render();
      return;
    }

    if (payload.type === 'append') {
      messages.push(payload.message);
      render();
      return;
    }

    if (payload.type === 'update') {
      updateLocalMessage(payload.message);
      editingMessageId = null;
      evaluatingMessageIds.delete(payload.message.id);
      render({ shouldScroll: false });
      return;
    }

    if (payload.type === 'remove') {
      removeLocalMessage(payload.id);
      render({ shouldScroll: false });
      return;
    }

    if (payload.type === 'cleanup') {
      clearLocalMessages();
      forwardStatus.textContent = `Cleaned up ${payload.removedCount || 0} report message${
        payload.removedCount === 1 ? '' : 's'
      }.`;
      render({ shouldScroll: false });
      return;
    }

    if (payload.type === 'evaluation-start') {
      evaluatingMessageIds.add(payload.id);
      render({ shouldScroll: false });
      return;
    }

    if (payload.type === 'evaluation-error') {
      evaluatingMessageIds.delete(payload.id);
      forwardStatus.textContent = payload.message;
      render({ shouldScroll: false });
      return;
    }

    if (payload.type === 'forward-targets') {
      updateForwardTargets(payload.forwardTargets || []);
      render({ shouldScroll: false });
      return;
    }

    if (payload.type === 'forward-results') {
      if (!payload.results?.length) {
        return;
      }

      const successes = payload.results.filter((result) => result.ok).length;
      forwardStatus.textContent = `Forwarded to ${successes}/${payload.results.length} target${
        payload.results.length === 1 ? '' : 's'
      }.`;
      return;
    }

    if (payload.type === 'error') {
      console.error(payload.message);
      forwardStatus.textContent = payload.message;
    }
  });

  socket.addEventListener('close', () => {
    setStatus('Offline', 'is-offline');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 1500);
  });

  socket.addEventListener('error', () => {
    setStatus('Offline', 'is-offline');
  });
}

forwardForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const target = forwardInput.value.trim();

  if (!target) {
    forwardInput.focus();
    return;
  }

  if (
    sendSocketMessage({
      type: 'add-forward-target',
      target,
    })
  ) {
    forwardInput.value = '';
    forwardStatus.textContent = 'Adding forward target...';
  }
});

renderSendCommand();
cleanupButton.addEventListener('click', cleanupEverything);
render();
connect();
