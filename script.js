'use strict';

/* =========================================================
   Student Record Management System: frontend logic

   Structure of this file
     1. Demo data store   (temporary JavaScript stand-in)
     2. StudentAPI        (the ONLY place the UI talks to data)
     3. Helpers           (formatting, validation, icons)
     4. Rendering         (stats, linked list view, tables)
     5. Dialogs and toasts
     6. Features          (add, search, delete, records, exit)
     7. Navigation and start-up

   IMPORTANT: The real project stores records in a singly
   linked list written in C. Everything in section 1 is only
   a JavaScript demo so the interface can be tested before
   the C backend exists.
   ========================================================= */


/* =========================================================
   1. DEMO DATA STORE
   A small linked-list class that mimics the logic of the C
   program (insert at end, search, delete by registration
   number). It is NOT the C implementation.
   ========================================================= */
class StudentNode {
  constructor(student) {
    this.data = student; // { regNo, name, marks }
    this.next = null;    // pointer to the next node
  }
}

class StudentLinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }

  // Insert a new node after the last node.
  insertAtEnd(student) {
    const node = new StudentNode(student);
    if (!this.head) {
      this.head = node;
    } else {
      let current = this.head;
      while (current.next) current = current.next;
      current.next = node;
    }
    this.size++;
  }

  // Walk from the head until a match or NULL.
  search(regNo) {
    let current = this.head;
    let position = 1;
    while (current) {
      if (current.data.regNo === regNo) return { student: current.data, position };
      current = current.next;
      position++;
    }
    return null;
  }

  // Unlink the node whose registration number matches.
  deleteByRegNo(regNo) {
    let previous = null;
    let current = this.head;
    while (current) {
      if (current.data.regNo === regNo) {
        if (previous) previous.next = current.next;
        else this.head = current.next;
        this.size--;
        return current.data;
      }
      previous = current;
      current = current.next;
    }
    return null;
  }

  toArray() {
    const out = [];
    let current = this.head;
    while (current) {
      out.push({ ...current.data });
      current = current.next;
    }
    return out;
  }

  clear() {
    this.head = null;
    this.size = 0;
  }
}

const STORAGE_KEY = 'srms-demo-students-v1';

const SAMPLE_STUDENTS = [
  { regNo: '21CS101', name: 'Arun Prakash', marks: 88 },
  { regNo: '21CS102', name: 'Meenakshi Sundaram', marks: 92.5 },
  { regNo: '21CS103', name: 'Karthik Raja', marks: 76 },
  { regNo: '21CS104', name: 'Divya Lakshmi', marks: 81 },
  { regNo: '21CS105', name: 'Mohamed Faizal', marks: 67.5 },
  { regNo: '21CS106', name: 'Priya Dharshini', marks: 95 },
  { regNo: '21CS107', name: 'Sanjay Kumar', marks: 58 },
  { regNo: '21CS108', name: 'Nandhini Devi', marks: 73 }
];

const list = new StudentLinkedList();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.toArray()));
  } catch (err) {
    /* storage unavailable: the demo still works for this session */
  }
}

function loadSamples() {
  list.clear();
  SAMPLE_STUDENTS.forEach((s) => list.insertAtEnd({ ...s }));
}

function loadInitialData() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (err) {
    saved = null;
  }

  if (Array.isArray(saved)) {
    saved
      .filter((s) => s && s.regNo && s.name && Number.isFinite(Number(s.marks)))
      .forEach((s) => list.insertAtEnd({ regNo: String(s.regNo), name: String(s.name), marks: Number(s.marks) }));
  } else {
    loadSamples();
  }
}


/* =========================================================
   2. StudentAPI
   Every screen calls these async methods and nothing else.
   To connect the C backend later, replace each method body
   with a fetch() call to your server, for example:

     list()           GET    /api/students
     add(student)     POST   /api/students           body: { regNo, name, marks }
     find(regNo)      GET    /api/students/:regNo    -> { student, position, total }
     remove(regNo)    DELETE /api/students/:regNo

   Keep the error codes 'DUPLICATE' and 'NOT_FOUND' (map them
   from HTTP 409 and 404) and the screens will keep working.
   ========================================================= */
class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const StudentAPI = {
  async list() {
    return list.toArray();
  },

  async add({ regNo, name, marks }) {
    if (list.search(regNo)) {
      throw new ApiError('DUPLICATE', `Registration number ${regNo} is already in the list.`);
    }
    list.insertAtEnd({ regNo, name, marks });
    persist();
    return { regNo, name, marks };
  },

  async find(regNo) {
    const hit = list.search(regNo);
    if (!hit) {
      throw new ApiError('NOT_FOUND', `No student has registration number ${regNo}.`);
    }
    return { student: { ...hit.student }, position: hit.position, total: list.size };
  },

  async remove(regNo) {
    const removed = list.deleteByRegNo(regNo);
    if (!removed) {
      throw new ApiError('NOT_FOUND', `No student has registration number ${regNo}.`);
    }
    persist();
    return { ...removed };
  },

  // Demo only: restores the sample records.
  async reset() {
    loadSamples();
    persist();
  }
};


/* =========================================================
   3. HELPERS
   ========================================================= */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const fmtMarks = (n) => String(+Number(n).toFixed(2));
const normReg = (value) => value.trim().toUpperCase();
const cleanName = (value) => value.trim().replace(/\s+/g, ' ');
const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const icon = (name, size = 20) =>
  `<svg class="ico" style="width:${size}px;height:${size}px" aria-hidden="true"><use href="#i-${name}"/></svg>`;

function regFormatError(value) {
  if (!value) return 'Enter a registration number.';
  if (!/^[A-Z0-9-]+$/.test(value)) return 'Use only letters, digits and hyphens.';
  if (value.length < 3 || value.length > 15) return 'Registration number must be 3 to 15 characters.';
  return '';
}

function newRegError(value) {
  const format = regFormatError(value);
  if (format) return format;
  if (state.students.some((s) => s.regNo === value)) {
    return `Registration number ${value} is already in the list.`;
  }
  return '';
}

function nameError(value) {
  if (!value) return 'Enter the student name.';
  if (value.length < 2 || value.length > 50) return 'Name must be 2 to 50 characters.';
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(value)) {
    return 'Use letters, spaces, dots, hyphens or apostrophes only.';
  }
  return '';
}

function marksError(value) {
  if (value === '') return 'Enter the marks.';
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value) || parseFloat(value) > 100) {
    return 'Enter marks between 0 and 100, with up to 2 decimal places.';
  }
  return '';
}

function setFieldError(input, errorEl, message) {
  errorEl.textContent = message || '';
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}


/* =========================================================
   4. RENDERING
   ========================================================= */
const state = {
  students: [],
  filter: '',
  flashReg: null // node to highlight the next time the list is drawn
};

const DASH_ROWS = 6;

function marksCell(marks) {
  return `<div class="marks"><b>${fmtMarks(marks)}</b><span class="bar" aria-hidden="true"><i style="width:${marks}%"></i></span></div>`;
}

function rowHTML(student, index, withActions) {
  const action = withActions
    ? `<td class="col-actions"><button type="button" class="icon-btn" data-delete="${esc(student.regNo)}" aria-label="Delete ${esc(student.name)}" title="Delete student">${icon('trash', 18)}</button></td>`
    : '';
  return `<tr><td class="col-num">${index + 1}</td><td class="reg">${esc(student.regNo)}</td><td>${esc(student.name)}</td><td>${marksCell(student.marks)}</td>${action}</tr>`;
}

function renderStats() {
  const { students } = state;
  const total = students.length;
  const sum = students.reduce((acc, s) => acc + s.marks, 0);
  const top = students.reduce((best, s) => (!best || s.marks > best.marks ? s : best), null);

  $('#statTotal').textContent = total;
  $('#statAvg').textContent = total ? (sum / total).toFixed(2) : '0.00';
  $('#statHigh').textContent = top ? fmtMarks(top.marks) : '—';
  $('#statHighName').textContent = top ? top.name : 'No records yet';
}

function renderChain() {
  const { students, flashReg } = state;
  const nodes = students
    .map((s) => `<div class="node${s.regNo === flashReg ? ' flash' : ''}"><div class="node-data"><strong>${esc(s.regNo)}</strong><span>${esc(s.name)}</span><span>Marks: ${fmtMarks(s.marks)}</span></div><div class="node-next" title="next pointer"></div></div><span class="link" aria-hidden="true"></span>`)
    .join('');

  const chain = $('#chain');
  chain.setAttribute('aria-label', `Linked list with ${students.length} node${students.length === 1 ? '' : 's'}`);
  chain.innerHTML = `<div class="chain-head">head</div><span class="link" aria-hidden="true"></span>${nodes}<div class="chain-null">NULL</div>`;
  state.flashReg = null; // flash only once
}

function renderDashboardTable() {
  const { students } = state;
  const total = students.length;
  const shown = students.slice(0, DASH_ROWS);

  $('#dashRows').innerHTML = shown.map((s, i) => rowHTML(s, i, false)).join('');
  $('#dashTableWrap').hidden = total === 0;
  $('#dashEmpty').hidden = total !== 0;

  if (total === 0) $('#dashCount').textContent = 'No students yet';
  else if (total > DASH_ROWS) $('#dashCount').textContent = `Showing the first ${DASH_ROWS} of ${total} students`;
  else $('#dashCount').textContent = `${total} student${total === 1 ? '' : 's'}`;
}

function renderRecords() {
  const { students, filter } = state;
  const query = filter.trim().toLowerCase();

  // Keep each student's real position in the list, even when filtered.
  const rows = students
    .map((student, index) => ({ student, index }))
    .filter(({ student }) =>
      !query || student.regNo.toLowerCase().includes(query) || student.name.toLowerCase().includes(query));

  $('#allRows').innerHTML = rows.map(({ student, index }) => rowHTML(student, index, true)).join('');
  $('#allTableWrap').hidden = rows.length === 0;
  $('#allEmpty').hidden = rows.length !== 0;

  if (students.length === 0) {
    $('#allEmptyTitle').textContent = 'No student records yet';
    $('#allEmptyText').textContent = 'Add the first student to start building the list.';
    $('#allEmptyAction').hidden = false;
    $('#allCount').textContent = '0 students';
  } else {
    $('#allEmptyTitle').textContent = 'No matching records';
    $('#allEmptyText').textContent = `No student matches "${filter.trim()}". Try a different registration number or name.`;
    $('#allEmptyAction').hidden = true;
    $('#allCount').textContent = `Showing ${rows.length} of ${students.length} student${students.length === 1 ? '' : 's'}`;
  }
}

function renderSuggestions() {
  $('#regList').innerHTML = state.students
    .map((s) => `<option value="${esc(s.regNo)}">${esc(s.name)}</option>`)
    .join('');
}

function renderAll() {
  renderStats();
  renderChain();
  renderDashboardTable();
  renderRecords();
  renderSuggestions();
}

async function refresh() {
  state.students = await StudentAPI.list();
  renderAll();
}


/* =========================================================
   5. DIALOGS AND TOASTS
   ========================================================= */
let modalResolve = null;
let modalReturnFocus = null;

function confirmDialog({ title, body, confirmText, cancelText = 'Cancel', danger = false, iconName = 'warning' }) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    modalReturnFocus = document.activeElement;

    const iconBox = $('#modalIcon');
    iconBox.className = `modal-icon${danger ? ' danger' : ''}`;
    iconBox.innerHTML = icon(iconName, 24);

    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = body;

    const confirmBtn = $('#modalConfirm');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    $('#modalCancel').textContent = cancelText;

    $('#modal').hidden = false;
    $('#modalCancel').focus();
  });
}

function closeModal(result) {
  $('#modal').hidden = true;
  const resolve = modalResolve;
  modalResolve = null;
  if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') modalReturnFocus.focus();
  if (resolve) resolve(result);
}

function toast(message, type = 'info') {
  const iconName = type === 'success' ? 'check' : type === 'error' ? 'xcircle' : 'info';
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(iconName, 20)}<span>${esc(message)}</span>`;

  const box = $('#toasts');
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3600);
}


/* =========================================================
   6. FEATURES
   ========================================================= */

/* ---------- Add Student ---------- */
const addForm = $('#addForm');
const addFields = [
  { input: $('#addReg'), error: $('#addRegErr'), read: () => normReg($('#addReg').value), check: newRegError },
  { input: $('#addName'), error: $('#addNameErr'), read: () => cleanName($('#addName').value), check: nameError },
  { input: $('#addMarks'), error: $('#addMarksErr'), read: () => $('#addMarks').value.trim(), check: marksError }
];

addFields.forEach((field) => {
  field.input.addEventListener('input', () => {
    setFieldError(field.input, field.error, '');
    $('#addSuccess').hidden = true;
  });
  field.input.addEventListener('blur', () => {
    if (field.input.value.trim()) setFieldError(field.input, field.error, field.check(field.read()));
  });
});

addForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  let firstInvalid = null;
  addFields.forEach((field) => {
    const message = field.check(field.read());
    setFieldError(field.input, field.error, message);
    if (message && !firstInvalid) firstInvalid = field.input;
  });
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const [regNo, name, marksText] = addFields.map((field) => field.read());
  try {
    await StudentAPI.add({ regNo, name, marks: parseFloat(marksText) });
    state.flashReg = regNo;
    await refresh();

    addForm.reset();
    $('#addSuccessText').textContent = `${name} (${regNo}) was added to the end of the list.`;
    $('#addSuccess').hidden = false;
    toast('Student added', 'success');
    $('#addReg').focus();
  } catch (err) {
    if (err.code === 'DUPLICATE') {
      setFieldError($('#addReg'), $('#addRegErr'), err.message);
      $('#addReg').focus();
    } else {
      toast(err.message || 'Something went wrong. Please try again.', 'error');
    }
  }
});

$('#addClear').addEventListener('click', () => {
  addForm.reset();
  addFields.forEach((field) => setFieldError(field.input, field.error, ''));
  $('#addSuccess').hidden = true;
  $('#addReg').focus();
});

/* ---------- Delete (shared by the Delete page, Search result and table buttons) ---------- */
function deleteSummary(student) {
  return `<p>This removes the record from the list. It can't be undone.</p>
    <dl class="modal-detail">
      <div><dt>Registration number</dt><dd>${esc(student.regNo)}</dd></div>
      <div><dt>Name</dt><dd>${esc(student.name)}</dd></div>
      <div><dt>Marks</dt><dd>${fmtMarks(student.marks)}</dd></div>
    </dl>`;
}

// Returns 'deleted', 'cancelled' or 'not_found'.
async function deleteFlow(regNo) {
  try {
    const { student } = await StudentAPI.find(regNo);

    const confirmed = await confirmDialog({
      title: `Delete ${student.name}?`,
      body: deleteSummary(student),
      confirmText: 'Delete student',
      danger: true,
      iconName: 'trash'
    });
    if (!confirmed) return 'cancelled';

    await StudentAPI.remove(regNo);
    await refresh();
    toast(`Deleted ${student.name} (${student.regNo})`, 'success');
    return 'deleted';
  } catch (err) {
    if (err.code === 'NOT_FOUND') return 'not_found';
    toast(err.message || 'Something went wrong. Please try again.', 'error');
    return 'cancelled';
  }
}

const deleteInput = $('#deleteReg');
deleteInput.addEventListener('input', () => setFieldError(deleteInput, $('#deleteErr'), ''));

$('#deleteForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const regNo = normReg(deleteInput.value);

  const formatMessage = regFormatError(regNo);
  if (formatMessage) {
    setFieldError(deleteInput, $('#deleteErr'), formatMessage);
    deleteInput.focus();
    return;
  }

  const status = await deleteFlow(regNo);
  if (status === 'not_found') {
    setFieldError(deleteInput, $('#deleteErr'), `No student has registration number ${regNo}.`);
    deleteInput.focus();
  } else if (status === 'deleted') {
    deleteInput.value = '';
    setFieldError(deleteInput, $('#deleteErr'), '');
  }
});

/* ---------- Search Student ---------- */
const searchInput = $('#searchReg');

function clearSearchResult() {
  $('#searchResult').innerHTML = '';
}

searchInput.addEventListener('input', () => {
  setFieldError(searchInput, $('#searchErr'), '');
  clearSearchResult();
});

function renderSearchFound({ student, position, total }) {
  $('#searchResult').innerHTML = `
    <article class="card">
      <div class="result-head">
        <div class="avatar" aria-hidden="true">${esc(initials(student.name))}</div>
        <div>
          <h3>${esc(student.name)}</h3>
          <p class="muted">Registration number ${esc(student.regNo)}</p>
        </div>
        <span class="pill">Student found</span>
      </div>
      <dl class="details">
        <div><dt>Registration number</dt><dd>${esc(student.regNo)}</dd></div>
        <div><dt>Student name</dt><dd>${esc(student.name)}</dd></div>
        <div><dt>Marks</dt><dd>${fmtMarks(student.marks)} / 100</dd></div>
        <div><dt>Position in list</dt><dd>Node ${position} of ${total}</dd></div>
      </dl>
      <div class="result-actions">
        <button type="button" class="btn btn-secondary" data-delete="${esc(student.regNo)}">${icon('trash', 18)}Delete this student</button>
      </div>
    </article>`;
}

function renderSearchMissing(regNo) {
  $('#searchResult').innerHTML = `
    <div class="notice error" role="alert">
      ${icon('xcircle', 20)}
      <div>
        <p><strong>Student not found</strong></p>
        <p>No student has registration number ${esc(regNo)}. All ${state.students.length} node${state.students.length === 1 ? '' : 's'} in the list were checked.</p>
      </div>
    </div>`;
}

$('#searchForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const regNo = normReg(searchInput.value);

  const formatMessage = regFormatError(regNo);
  if (formatMessage) {
    setFieldError(searchInput, $('#searchErr'), formatMessage);
    clearSearchResult();
    searchInput.focus();
    return;
  }

  try {
    renderSearchFound(await StudentAPI.find(regNo));
  } catch (err) {
    if (err.code === 'NOT_FOUND') renderSearchMissing(regNo);
    else toast(err.message || 'Something went wrong. Please try again.', 'error');
  }
});

/* ---------- Display Records ---------- */
$('#filterInput').addEventListener('input', (event) => {
  state.filter = event.target.value;
  renderRecords();
});

/* ---------- Reset demo data ---------- */
$('#resetBtn').addEventListener('click', async () => {
  closeSidebar();
  const confirmed = await confirmDialog({
    title: 'Reset demo data?',
    body: '<p>All current records will be replaced by the 8 sample students.</p>',
    confirmText: 'Reset data',
    danger: true,
    iconName: 'reset'
  });
  if (!confirmed) return;

  await StudentAPI.reset();
  state.filter = '';
  $('#filterInput').value = '';
  clearSearchResult();
  await refresh();
  toast('Sample records restored', 'success');
});

/* ---------- Exit ---------- */
$('#exitBtn').addEventListener('click', async () => {
  closeSidebar();
  const confirmed = await confirmDialog({
    title: 'Exit the application?',
    body: '<p>Demo records saved in this browser will still be here when you come back.</p>',
    confirmText: 'Exit',
    iconName: 'logout'
  });
  if (!confirmed) return;

  $('#bye').hidden = false;
  $('#byeRestart').focus();
});

$('#byeRestart').addEventListener('click', () => {
  $('#bye').hidden = true;
  location.hash = 'dashboard';
  showView('dashboard');
});


/* =========================================================
   7. NAVIGATION AND START-UP
   ========================================================= */
const VIEWS = {
  dashboard: { title: 'Dashboard', sub: 'Overview of the student list' },
  add: { title: 'Add Student', sub: 'Insert a new record at the end of the list' },
  search: { title: 'Search Student', sub: 'Find a record by registration number' },
  delete: { title: 'Delete Student', sub: 'Remove a record by registration number' },
  records: { title: 'Display Records', sub: 'All student records in list order' }
};

function showView(name) {
  if (!VIEWS[name]) name = 'dashboard';

  $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${name}`));
  $$('.nav-btn[data-view]').forEach((btn) => {
    const active = btn.dataset.view === name;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  $('#pageTitle').textContent = VIEWS[name].title;
  $('#pageSub').textContent = VIEWS[name].sub;
  document.title = `${VIEWS[name].title} | Student Record Management System`;

  if (name !== 'search') clearSearchResult();
  if (name !== 'add') $('#addSuccess').hidden = true;

  window.scrollTo(0, 0);

  if (name === 'dashboard') {
    const flashed = $('#chain .flash');
    if (flashed) flashed.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  // Focus the first field on desktop only, so phones do not pop up the keyboard.
  if (window.matchMedia('(hover: hover)').matches) {
    const firstInput = $(`#view-${name} input`);
    if (firstInput) firstInput.focus({ preventScroll: true });
  }
}

const currentHash = () => location.hash.replace('#', '');

window.addEventListener('hashchange', () => showView(currentHash()));

/* Sidebar (mobile) */
const sidebar = $('#sidebar');
const scrim = $('#scrim');
const menuBtn = $('#menuBtn');

function openSidebar() {
  sidebar.classList.add('open');
  scrim.classList.add('show');
  menuBtn.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  scrim.classList.remove('show');
  menuBtn.setAttribute('aria-expanded', 'false');
}

menuBtn.addEventListener('click', () => (sidebar.classList.contains('open') ? closeSidebar() : openSidebar()));
scrim.addEventListener('click', closeSidebar);

$$('.nav-btn[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.view;
    closeSidebar();
    if (currentHash() === target) showView(target);
    else location.hash = target;
  });
});

/* Buttons that jump to another page, and delete buttons inside tables and results */
document.addEventListener('click', async (event) => {
  const goto = event.target.closest('[data-goto]');
  if (goto) {
    const target = goto.dataset.goto;
    if (currentHash() === target) showView(target);
    else location.hash = target;
    return;
  }

  const del = event.target.closest('[data-delete]');
  if (del) {
    const status = await deleteFlow(del.dataset.delete);
    if (status === 'deleted') clearSearchResult();
    else if (status === 'not_found') toast('That student is no longer in the list.', 'info');
  }
});

/* Dialog buttons and keyboard */
$('#modalConfirm').addEventListener('click', () => closeModal(true));
$('#modalCancel').addEventListener('click', () => closeModal(false));
$('#modal').addEventListener('click', (event) => {
  if (event.target === $('#modal')) closeModal(false);
});

document.addEventListener('keydown', (event) => {
  if (!$('#modal').hidden) {
    if (event.key === 'Escape') {
      closeModal(false);
    } else if (event.key === 'Tab') {
      const buttons = $$('#modal button');
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (event.key === 'Escape') closeSidebar();
});

/* Start */
(async function init() {
  loadInitialData();
  await refresh();
  showView(currentHash());
})();
