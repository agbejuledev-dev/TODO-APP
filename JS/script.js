//    State //
  let tasks     = JSON.parse(localStorage.getItem('taskflow_tasks')) || [];
  let filter    = 'all';
  let dragSrcEl = null;
  let editingId = null;

//  DOM refs //
  const taskInput    = document.getElementById('taskInput');
  const addBtn       = document.getElementById('addTask');
  const taskList     = document.getElementById('taskList');
  const themeToggle  = document.getElementById('themeToggle');
  const clearBtn     = document.getElementById('clearCompleted');
  const emptyState   = document.getElementById('emptyState');
  const taskCount    = document.getElementById('taskCount');
  const progressBar  = document.getElementById('progressBar');
  const toast        = document.getElementById('toast');
  const filterTabs   = document.querySelectorAll('.filter-tab');

  // Helpers //
  const save   = () => localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
  const uid    = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // Add //
  function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
      taskInput.focus();
      taskInput.style.outline = '2px solid var(--del)';
      setTimeout(() => taskInput.style.outline = '', 700);
      return;
    }
    tasks.push({ id: uid(), text, completed: false });
    taskInput.value = '';
    save();
    renderAll();
    showToast('Task added ✓');
  }

  // Delete //
  function deleteTask(id) {
    const li = taskList.querySelector(`[data-id="${id}"]`);
    if (li) {
      li.classList.add('removing');
      li.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== id);
        save();
        renderAll();
      }, { once: true });
    }
  }

  // Toggle //
  function toggleTask(id) {
    const t = tasks.find(t => t.id === id);
    if (t) { t.completed = !t.completed; save(); renderAll(); }
  }

  // Edit //
  function startEdit(id) {
    editingId = id;
    renderAll();
    const inp = taskList.querySelector('.task-edit-input');
    if (inp) { inp.focus(); inp.select(); }
  }

  function saveEdit(id) {
    const inp = taskList.querySelector('.task-edit-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (val) {
      const t = tasks.find(t => t.id === id);
      if (t) t.text = val;
      save();
    }
    editingId = null;
    renderAll();
  }

  // Filter //
  function setFilter(f) {
    filter = f;
    filterTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.filter === f));
    renderAll();
  }

  // Render //
  function renderAll() {
    const all       = tasks.length;
    const done      = tasks.filter(t => t.completed).length;
    const active    = all - done;
    const pct       = all ? Math.round((done / all) * 100) : 0;

    // Progress + count
    progressBar.style.width = pct + '%';
    taskCount.innerHTML = `<strong>${active}</strong> task${active !== 1 ? 's' : ''} remaining`;

    // Badges
    document.getElementById('badge-all').textContent       = all;
    document.getElementById('badge-active').textContent    = active;
    document.getElementById('badge-completed').textContent = done;

    // Filtered list
    const visible = tasks.filter(t => {
      if (filter === 'active')    return !t.completed;
      if (filter === 'completed') return  t.completed;
      return true;
    });

    // Render items
    taskList.innerHTML = '';
    visible.forEach((task, idx) => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' completed' : '');
      li.setAttribute('draggable', 'true');
      li.dataset.id = task.id;
      li.style.animationDelay = `${idx * 0.04}s`;

      const isEditing = editingId === task.id;

      li.innerHTML = `
        <span class="drag-handle" title="Drag to reorder">⠿</span>
        <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''} />
        ${isEditing
          ? `<input class="task-edit-input" type="text" value="${escape(task.text)}" />`
          : `<span class="task-text">${escape(task.text)}</span>`
        }
        <div class="task-actions">
          ${isEditing
            ? `<button class="task-action save" title="Save">✓</button>`
            : `<button class="task-action edit" title="Edit">✎</button>`
          }
          <button class="task-action del" title="Delete">✕</button>
        </div>
      `;

      // Events
      li.querySelector('.task-check').addEventListener('change', () => toggleTask(task.id));

      if (isEditing) {
        const editInp = li.querySelector('.task-edit-input');
        editInp.addEventListener('keydown', e => {
          if (e.key === 'Enter')  saveEdit(task.id);
          if (e.key === 'Escape') { editingId = null; renderAll(); }
        });
        editInp.addEventListener('blur', () => saveEdit(task.id));
        li.querySelector('.task-action.save').addEventListener('mousedown', e => {
          e.preventDefault();
          saveEdit(task.id);
        });
      } else {
        li.querySelector('.task-text').addEventListener('dblclick', () => startEdit(task.id));
        li.querySelector('.task-action.edit').addEventListener('click',  () => startEdit(task.id));
      }

      li.querySelector('.task-action.del').addEventListener('click', () => deleteTask(task.id));

      // Drag & drop //
      li.addEventListener('dragstart', handleDragStart);
      li.addEventListener('dragover',  handleDragOver);
      li.addEventListener('drop',      handleDrop);
      li.addEventListener('dragend',   handleDragEnd);

      taskList.appendChild(li);
    });

    // Empty state //
    emptyState.classList.toggle('visible', visible.length === 0);
  }

  // Drag & Drop //
  function handleDragStart(e) {
    dragSrcEl = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
  }
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
    if (this !== dragSrcEl) this.classList.add('drag-over');
  }
  function handleDrop(e) {
    e.stopPropagation();
    if (dragSrcEl === this) return;

    const srcId  = e.dataTransfer.getData('text/plain');
    const dstId  = this.dataset.id;
    const srcIdx = tasks.findIndex(t => t.id === srcId);
    const dstIdx = tasks.findIndex(t => t.id === dstId);
    if (srcIdx < 0 || dstIdx < 0) return;

    const [moved] = tasks.splice(srcIdx, 1);
    tasks.splice(dstIdx, 0, moved);
    save();
    renderAll();
  }
  function handleDragEnd() {
    document.querySelectorAll('.task-item').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
    dragSrcEl = null;
  }

  // Theme //
  const savedTheme = localStorage.getItem('taskflow_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '☀' : '☾';

  themeToggle.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    themeToggle.textContent = next === 'dark' ? '☀' : '☾';
    localStorage.setItem('taskflow_theme', next);
  });

  // Event listeners //
  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keydown', e => e.key === 'Enter' && addTask());

  clearBtn.addEventListener('click', () => {
    const count = tasks.filter(t => t.completed).length;
    if (!count) return;
    tasks = tasks.filter(t => !t.completed);
    save();
    renderAll();
    showToast(`Cleared ${count} completed task${count !== 1 ? 's' : ''}`);
  });

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => setFilter(tab.dataset.filter));
  });

  // Init //
  renderAll();