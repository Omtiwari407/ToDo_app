(() => {
  'use strict';

  const TASK_STORAGE_KEY = 'taskflow.tasks.v1';
  const THEME_STORAGE_KEY = 'taskflow.theme.v1';
  const $ = (id) => document.getElementById(id);
  const elements = {
    form: $('task-form'), title: $('task-title'), description: $('task-description'), dueDate: $('task-date'),
    priority: $('task-priority'), category: $('task-category'), taskList: $('task-list'),
    emptyState: $('empty-state'), search: $('task-search'), categoryFilter: $('category-filter'),
    priorityFilter: $('priority-filter'), sort: $('sort-tasks'), error: $('form-error'),
    clearCompleted: $('clear-completed'), toastRegion: $('toast-region'), sidebar: $('sidebar'), overlay: $('mobile-overlay')
  };
  const today = localDateString(new Date());
  let tasks = readTasks();
  let currentView = 'day';
  let statusFilter = 'all';
  let editingId = null;
  let toastId = 0;
  let theme = readTheme();

  function readTasks() {
    try {
      const raw = localStorage.getItem(TASK_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((task) => task && typeof task.id === 'string' && typeof task.title === 'string')
        .map((task) => ({
          id: task.id,
          title: task.title.trim(),
          description: typeof task.description === 'string' ? task.description : '',
          dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
          priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
          category: ['Personal', 'Work', 'Study', 'Other'].includes(task.category) ? task.category : 'Other',
          completed: Boolean(task.completed),
          createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString(),
          completedAt: typeof task.completedAt === 'string' ? task.completedAt : ''
        })).filter((task) => task.title);
    } catch (error) {
      console.error('Task data could not be read from LocalStorage.', error);
      return [];
    }
  }

  function saveTasks(nextTasks = tasks) {
    try {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(nextTasks));
      tasks = nextTasks;
      return true;
    } catch (error) {
      console.error('Task data could not be saved to LocalStorage.', error);
      showToast('Could not save changes. Check your browser storage.', 'error');
      return false;
    }
  }

  function readTheme() {
    try { return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
    catch (error) { console.error('Theme preference could not be read.', error); return 'light'; }
  }

  function saveTheme() {
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); }
    catch (error) {
      console.error('Theme preference could not be saved.', error);
      showToast('Theme changed for this session, but the preference could not be saved.', 'error');
    }
  }

  function applyTheme() {
    document.body.dataset.theme = theme;
    const button = $('theme-toggle');
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    $('theme-label').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    button.querySelector('use').setAttribute('href', theme === 'dark' ? '#i-sun-small' : '#i-moon');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#15141d' : '#f7f6fc');
  }

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDate(dateString, options = { month: 'short', day: 'numeric' }) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day));
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    elements.toastRegion.append(toast);
    const id = ++toastId;
    window.setTimeout(() => {
      toast.classList.add('toast-leave');
      window.setTimeout(() => toast.remove(), 180);
    }, 2600 + id % 2 * 200);
  }

  function baseTasks() {
    if (currentView === 'upcoming') return tasks.filter((task) => !task.completed && task.dueDate && task.dueDate > today);
    if (currentView === 'completed') return tasks.filter((task) => task.completed);
    if (currentView === 'day') return tasks.filter((task) => task.dueDate ? task.dueDate <= today : task.createdAt.slice(0, 10) === today);
    return tasks;
  }

  function getVisibleTasks() {
    let result = baseTasks();
    if (statusFilter === 'active') result = result.filter((task) => !task.completed);
    if (statusFilter === 'completed') result = result.filter((task) => task.completed);
    const query = elements.search.value.trim().toLocaleLowerCase();
    if (query) result = result.filter((task) => `${task.title} ${task.description}`.toLocaleLowerCase().includes(query));
    if (elements.categoryFilter.value !== 'all') result = result.filter((task) => task.category === elements.categoryFilter.value);
    if (elements.priorityFilter.value !== 'all') result = result.filter((task) => task.priority === elements.priorityFilter.value);
    const sortBy = elements.sort.value;
    const priorityWeight = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => {
      if (sortBy === 'priority') return priorityWeight[a.priority] - priorityWeight[b.priority] || b.createdAt.localeCompare(a.createdAt);
      if (sortBy === 'due') return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || b.createdAt.localeCompare(a.createdAt);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return result;
  }

  function render() {
    const activeTasks = tasks.filter((task) => !task.completed);
    const completedTasks = tasks.filter((task) => task.completed);
    const overdueTasks = activeTasks.filter((task) => task.dueDate && task.dueDate < today);
    const dueToday = activeTasks.filter((task) => task.dueDate === today || (!task.dueDate && task.createdAt.slice(0, 10) === today));
    const upcomingTasks = activeTasks.filter((task) => task.dueDate && task.dueDate > today);

    $('stat-total').textContent = tasks.length;
    $('stat-pending').textContent = activeTasks.length;
    $('stat-completed').textContent = completedTasks.length;
    $('stat-overdue').textContent = overdueTasks.length;
    $('nav-day-count').textContent = dueToday.length;
    $('nav-upcoming-count').textContent = upcomingTasks.length;
    $('nav-all-count').textContent = tasks.length;
    $('nav-completed-count').textContent = completedTasks.length;
    $('filter-all-count').textContent = baseTasks().length;
    $('filter-active-count').textContent = baseTasks().filter((task) => !task.completed).length;
    $('filter-completed-count').textContent = baseTasks().filter((task) => task.completed).length;

    const completedPercent = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
    $('progress-bar').style.width = `${completedPercent}%`;
    $('progress-label').textContent = `${completedPercent}%`;
    const headingByView = { day: 'Today’s focus', upcoming: 'Coming up', all: 'All tasks', completed: 'Completed tasks' };
    const breadcrumbByView = { day: 'My Day', upcoming: 'Upcoming', all: 'All Tasks', completed: 'Completed' };
    const subtitleByView = {
      day: 'Make today count. One task at a time.',
      upcoming: 'A clear view of what’s on the horizon.',
      all: 'Everything you want to get done, in one place.',
      completed: 'Look how far you’ve come.'
    };
    $('list-heading').textContent = headingByView[currentView];
    $('breadcrumb-view').textContent = breadcrumbByView[currentView];
    $('page-subtitle').textContent = subtitleByView[currentView];

    const visible = getVisibleTasks();
    elements.taskList.replaceChildren(...visible.map(createTaskRow));
    $('visible-summary').textContent = `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'}`;
    $('footer-summary').textContent = activeTasks.length === 0 ? 'You’re all caught up.' : `${activeTasks.length} ${activeTasks.length === 1 ? 'task' : 'tasks'} left to do`;
    elements.clearCompleted.hidden = completedTasks.length === 0;

    const hasFilters = Boolean(elements.search.value.trim()) || elements.categoryFilter.value !== 'all' || elements.priorityFilter.value !== 'all' || statusFilter !== 'all';
    elements.emptyState.hidden = visible.length > 0;
    $('empty-add').hidden = false;
    $('empty-clear-filters').hidden = true;
    if (!visible.length) {
      if (hasFilters) {
        $('empty-title').textContent = 'No tasks match those filters';
        $('empty-description').textContent = 'Try another search or clear a filter to see more tasks.';
        $('empty-add').hidden = true;
        $('empty-clear-filters').hidden = false;
      } else {
        const emptyCopy = {
          day: ['A clear space to begin', 'Add a task for today and make a little progress.', 'Create your first task'],
          upcoming: ['Nothing on the horizon', 'Tasks with future due dates will show up here.', 'Plan a task'],
          all: ['A clear space to begin', 'Add a task and make a little progress today.', 'Create your first task'],
          completed: ['Your wins will show up here', 'Complete a task and you’ll find it right here.', 'Create a new task']
        }[currentView];
        $('empty-title').textContent = emptyCopy[0];
        $('empty-description').textContent = emptyCopy[1];
        $('empty-add').textContent = emptyCopy[2];
        $('empty-add').prepend(makeIcon('i-plus'));
        $('empty-add').hidden = currentView === 'completed';
      }
    }
    document.querySelectorAll('.nav-link').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === currentView);
      button.setAttribute('aria-current', button.dataset.view === currentView ? 'page' : 'false');
    });
    document.querySelectorAll('.filter-tab').forEach((button) => {
      const selected = button.dataset.status === statusFilter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
  }

  function makeIcon(symbol) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${symbol}`);
    svg.append(use);
    return svg;
  }

  function createTaskRow(task) {
    const row = document.createElement('article');
    row.className = `task-row${task.completed ? ' completed' : ''}`;
    row.dataset.id = task.id;
    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = 'task-check';
    checkbox.setAttribute('aria-label', task.completed ? `Mark ${task.title} as active` : `Mark ${task.title} as complete`);
    checkbox.setAttribute('aria-pressed', String(task.completed));
    if (task.completed) checkbox.append(makeIcon('i-check'));
    checkbox.addEventListener('click', () => toggleTask(task.id));

    const main = document.createElement('div');
    main.className = 'task-main';
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    main.append(title);
    if (task.description) {
      const description = document.createElement('div');
      description.className = 'task-description';
      description.textContent = task.description;
      main.append(description);
    }
    const metadata = document.createElement('div');
    metadata.className = 'task-meta';
    metadata.append(makeChip(task.category, 'category-chip'));
    metadata.append(makeChip(`${capitalize(task.priority)} priority`, `priority-chip priority-${task.priority}`));
    if (task.dueDate) {
      const dueChip = makeChip(`${task.dueDate < today && !task.completed ? 'Overdue · ' : ''}${formatDate(task.dueDate)}`, `due-chip${task.dueDate < today && !task.completed ? ' overdue' : ''}${task.dueDate === today && !task.completed ? ' due-soon' : ''}`, 'i-calendar');
      metadata.append(dueChip);
    }
    main.append(metadata);

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const editButton = actionButton('i-edit', `Edit ${task.title}`, () => openTaskForm(task.id));
    const deleteButton = actionButton('i-trash', `Delete ${task.title}`, () => deleteTask(task.id));
    deleteButton.classList.add('delete');
    actions.append(editButton, deleteButton);
    row.append(checkbox, main, actions);
    return row;
  }

  function makeChip(text, className, iconName = '') {
    const chip = document.createElement('span');
    chip.className = `task-chip ${className}`;
    if (iconName) chip.append(makeIcon(iconName));
    chip.append(document.createTextNode(text));
    return chip;
  }

  function actionButton(iconName, label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'task-action';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(makeIcon(iconName));
    button.addEventListener('click', handler);
    return button;
  }

  function capitalize(word) { return word.charAt(0).toUpperCase() + word.slice(1); }

  function openTaskForm(id = null) {
    editingId = id;
    const task = id ? tasks.find((item) => item.id === id) : null;
    $('form-heading').textContent = task ? 'Edit task' : 'Create a task';
    $('save-task').querySelector('span').textContent = task ? 'Save changes' : 'Add task';
    elements.title.value = task ? task.title : '';
    elements.description.value = task ? task.description : '';
    elements.dueDate.value = task ? task.dueDate : '';
    elements.priority.value = task ? task.priority : 'medium';
    elements.category.value = task ? task.category : 'Personal';
    elements.error.textContent = '';
    elements.form.hidden = false;
    elements.title.focus();
    elements.form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeTaskForm() {
    elements.form.hidden = true;
    elements.form.reset();
    elements.error.textContent = '';
    editingId = null;
  }

  function saveTask(event) {
    event.preventDefault();
    const title = elements.title.value.trim();
    if (!title) {
      elements.error.textContent = 'Please enter a task title.';
      elements.title.focus();
      return;
    }
    const dueDate = elements.dueDate.value;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      elements.error.textContent = 'Please choose a valid due date.';
      elements.dueDate.focus();
      return;
    }
    const existing = editingId ? tasks.find((task) => task.id === editingId) : null;
    const updatedTask = {
      id: existing ? existing.id : makeId(),
      title,
      description: elements.description.value.trim(),
      dueDate,
      priority: elements.priority.value,
      category: elements.category.value,
      completed: existing ? existing.completed : false,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      completedAt: existing ? existing.completedAt : ''
    };
    const nextTasks = existing
      ? tasks.map((task) => task.id === editingId ? updatedTask : task)
      : [updatedTask, ...tasks];
    const wasEditing = Boolean(existing);
    if (!saveTasks(nextTasks)) return;
    closeTaskForm();
    render();
    showToast(wasEditing ? 'Task updated.' : 'Task added.');
  }

  function makeId() {
    return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const completed = !task.completed;
    const nextTasks = tasks.map((item) => item.id === id
      ? { ...item, completed, completedAt: completed ? new Date().toISOString() : '' }
      : item);
    if (!saveTasks(nextTasks)) return;
    render();
    showToast(completed ? 'Nice work — task completed.' : 'Task moved back to active.');
  }

  function deleteTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task || !window.confirm(`Delete “${task.title}”? This can’t be undone.`)) return;
    const nextTasks = tasks.filter((item) => item.id !== id);
    if (!saveTasks(nextTasks)) return;
    render();
    showToast('Task deleted.');
  }

  function clearCompleted() {
    const count = tasks.filter((task) => task.completed).length;
    if (!count) return;
    if (!window.confirm(`Clear ${count} completed ${count === 1 ? 'task' : 'tasks'}? This can’t be undone.`)) return;
    const nextTasks = tasks.filter((task) => !task.completed);
    if (!saveTasks(nextTasks)) return;
    render();
    showToast('Completed tasks cleared.');
  }

  function clearFilters() {
    elements.search.value = '';
    elements.categoryFilter.value = 'all';
    elements.priorityFilter.value = 'all';
    statusFilter = 'all';
    render();
  }

  function setView(view) {
    currentView = view;
    statusFilter = 'all';
    render();
    closeMobileNav();
  }

  function openMobileNav() {
    elements.sidebar.classList.add('open');
    elements.overlay.classList.add('show');
    $('menu-toggle').setAttribute('aria-expanded', 'true');
  }

  function closeMobileNav() {
    elements.sidebar.classList.remove('open');
    elements.overlay.classList.remove('show');
    $('menu-toggle').setAttribute('aria-expanded', 'false');
  }

  function setupDateAndGreeting() {
    const now = new Date();
    $('top-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(now);
    $('date-long').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
    $('date-year').textContent = new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(now);
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    $('page-title').innerHTML = `${greeting}, <span>let’s focus.</span>`;
  }

  $('open-task-form').addEventListener('click', () => openTaskForm());
  $('empty-add').addEventListener('click', () => openTaskForm());
  $('empty-clear-filters').addEventListener('click', clearFilters);
  $('close-task-form').addEventListener('click', closeTaskForm);
  $('cancel-task').addEventListener('click', closeTaskForm);
  elements.form.addEventListener('submit', saveTask);
  elements.clearCompleted.addEventListener('click', clearCompleted);
  $('theme-toggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    saveTheme();
    applyTheme();
  });
  document.querySelector('.brand').addEventListener('click', (event) => {
    event.preventDefault();
    setView('day');
  });
  $('menu-toggle').addEventListener('click', openMobileNav);
  elements.overlay.addEventListener('click', closeMobileNav);
  document.querySelectorAll('.nav-link').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelectorAll('.filter-tab').forEach((button) => button.addEventListener('click', () => {
    statusFilter = button.dataset.status;
    render();
  }));
  [elements.search, elements.categoryFilter, elements.priorityFilter, elements.sort].forEach((control) => {
    control.addEventListener(control === elements.search ? 'input' : 'change', render);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      elements.search.focus();
    }
    if (event.key === 'Escape') {
      if (!elements.form.hidden) closeTaskForm();
      closeMobileNav();
    }
  });

  applyTheme();
  setupDateAndGreeting();
  render();
})();
