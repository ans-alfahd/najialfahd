const days = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس'
];

const periods = [1, 2, 3, 4, 5, 6];

const grades = [
  { id: 'grade-1', label: 'الصف الأول', sections: ['أ', 'ب'] },
  { id: 'grade-2', label: 'الصف الثاني', sections: ['أ', 'ب'] },
  { id: 'grade-3', label: 'الصف الثالث', sections: ['أ', 'ب'] },
  { id: 'grade-4', label: 'الصف الرابع', sections: ['أ', 'ب'] },
  { id: 'grade-5', label: 'الصف الخامس', sections: ['أ', 'ب'] },
  { id: 'grade-6', label: 'الصف السادس', sections: ['أ', 'ب'] }
];

const slotDetails = {};

const state = {
  subjects: [
    { id: 'subject-1', name: 'اللغة العربية' },
    { id: 'subject-2', name: 'الرياضيات' },
    { id: 'subject-3', name: 'العلوم' }
  ],
  teachers: [
    { id: 'teacher-1', name: 'أ. أحمد العلي' },
    { id: 'teacher-2', name: 'أ. منى الحربي' },
    { id: 'teacher-3', name: 'أ. سامي الشريف' }
  ],
  schedule: {}
};

let subjectCounter = state.subjects.length;
let teacherCounter = state.teachers.length;
let currentSlotKey = null;
let scheduleFeedbackTimeoutId = null;

let subjectForm;
let subjectInput;
let subjectList;
let subjectFeedback;
let teacherForm;
let teacherInput;
let teacherList;
let teacherFeedback;
let scheduleTable;
let scheduleFeedback;
let lessonModal;
let lessonModalTitle;
let lessonForm;
let subjectSelect;
let teacherSelect;
let noteInput;
let modalBackdrop;
let lessonCancelButton;
let modalCloseButton;
let slotSummary;

const scheduleCellCache = new Map();

document.addEventListener('DOMContentLoaded', () => {
  cacheDomElements();
  initializeScheduleTable();
  renderSubjects();
  renderTeachers();
  attachEventListeners();
});

function cacheDomElements() {
  subjectForm = document.getElementById('subjectForm');
  subjectInput = document.getElementById('subjectInput');
  subjectList = document.getElementById('subjectList');
  subjectFeedback = document.getElementById('subjectFeedback');

  teacherForm = document.getElementById('teacherForm');
  teacherInput = document.getElementById('teacherInput');
  teacherList = document.getElementById('teacherList');
  teacherFeedback = document.getElementById('teacherFeedback');

  scheduleTable = document.getElementById('scheduleTable');
  scheduleFeedback = document.getElementById('scheduleFeedback');

  lessonModal = document.getElementById('lessonModal');
  lessonModalTitle = document.getElementById('lessonModalTitle');
  lessonForm = document.getElementById('lessonForm');
  subjectSelect = document.getElementById('subjectSelect');
  teacherSelect = document.getElementById('teacherSelect');
  noteInput = document.getElementById('noteInput');
  modalBackdrop = document.getElementById('modalBackdrop');
  lessonCancelButton = document.getElementById('lessonCancelButton');
  modalCloseButton = lessonModal.querySelector('.modal-close');
  slotSummary = document.getElementById('slotSummary');
}

function attachEventListeners() {
  subjectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = normalizeText(subjectInput.value);
    if (!value) {
      setFormFeedback(subjectFeedback, 'الرجاء إدخال اسم المادة.', 'error');
      subjectInput.focus();
      return;
    }
    if (state.subjects.some((subject) => subject.name === value)) {
      setFormFeedback(subjectFeedback, 'هذه المادة مضافة مسبقًا.', 'error');
      subjectInput.focus();
      return;
    }
    subjectCounter += 1;
    state.subjects.push({ id: `subject-${subjectCounter}`, name: value });
    subjectInput.value = '';
    setFormFeedback(subjectFeedback, 'تمت إضافة المادة بنجاح.', 'success');
    renderSubjects();
  });

  teacherForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = normalizeText(teacherInput.value);
    if (!value) {
      setFormFeedback(teacherFeedback, 'الرجاء إدخال اسم المعلم.', 'error');
      teacherInput.focus();
      return;
    }
    if (state.teachers.some((teacher) => teacher.name === value)) {
      setFormFeedback(teacherFeedback, 'هذا المعلم مضاف مسبقًا.', 'error');
      teacherInput.focus();
      return;
    }
    teacherCounter += 1;
    state.teachers.push({ id: `teacher-${teacherCounter}`, name: value });
    teacherInput.value = '';
    setFormFeedback(teacherFeedback, 'تمت إضافة المعلم بنجاح.', 'success');
    renderTeachers();
  });

  lessonForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!currentSlotKey) {
      return;
    }
    const subjectId = subjectSelect.value;
    const teacherId = teacherSelect.value;
    const note = normalizeText(noteInput.value);

    if (!subjectId || !teacherId) {
      setScheduleFeedback('الرجاء اختيار مادة ومعلم قبل حفظ الحصة.', 'error');
      return;
    }

    state.schedule[currentSlotKey] = { subjectId, teacherId, note };
    renderSlot(currentSlotKey);
    setScheduleFeedback('تم حفظ الحصة بنجاح.', 'success');
    closeLessonModal();
  });

  lessonCancelButton.addEventListener('click', () => {
    closeLessonModal();
  });

  modalCloseButton.addEventListener('click', () => {
    closeLessonModal();
  });

  modalBackdrop.addEventListener('click', () => {
    closeLessonModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !lessonModal.classList.contains('hidden')) {
      closeLessonModal();
    }
  });
}

function initializeScheduleTable() {
  scheduleTable.innerHTML = '';
  scheduleCellCache.clear();
  Object.keys(slotDetails).forEach((key) => {
    delete slotDetails[key];
  });
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const headerRow2 = document.createElement('tr');

  const dayHeader = document.createElement('th');
  dayHeader.textContent = 'اليوم';
  dayHeader.rowSpan = 2;
  headerRow.appendChild(dayHeader);

  const periodHeader = document.createElement('th');
  periodHeader.textContent = 'الحصة';
  periodHeader.rowSpan = 2;
  headerRow.appendChild(periodHeader);

  grades.forEach((grade) => {
    const gradeHeader = document.createElement('th');
    gradeHeader.textContent = grade.label;
    gradeHeader.colSpan = grade.sections.length;
    headerRow.appendChild(gradeHeader);

    grade.sections.forEach((section) => {
      const sectionHeader = document.createElement('th');
      sectionHeader.textContent = `شعبة ${section}`;
      headerRow2.appendChild(sectionHeader);
    });
  });

  thead.appendChild(headerRow);
  thead.appendChild(headerRow2);
  scheduleTable.appendChild(thead);

  const tbody = document.createElement('tbody');

  days.forEach((day) => {
    periods.forEach((period, index) => {
      const row = document.createElement('tr');

      if (index === 0) {
        const dayCell = document.createElement('th');
        dayCell.textContent = day;
        dayCell.rowSpan = periods.length;
        dayCell.classList.add('day-cell');
        dayCell.setAttribute('scope', 'rowgroup');
        row.appendChild(dayCell);
      }

      const periodCell = document.createElement('th');
      periodCell.textContent = period;
      periodCell.classList.add('period-cell');
      periodCell.setAttribute('scope', 'row');
      row.appendChild(periodCell);

      grades.forEach((grade) => {
        grade.sections.forEach((section) => {
          const cell = document.createElement('td');
          const slotKey = `${day}|${period}|${grade.id}|${section}`;
          cell.dataset.slotKey = slotKey;
          slotDetails[slotKey] = {
            day,
            period,
            gradeId: grade.id,
            gradeLabel: grade.label,
            section
          };
          const slot = createEmptySlot(slotKey);
          cell.appendChild(slot);
          row.appendChild(cell);
          scheduleCellCache.set(slotKey, cell);
        });
      });

      tbody.appendChild(row);
    });
  });

  scheduleTable.appendChild(tbody);
}

function createEmptySlot(slotKey) {
  const container = document.createElement('div');
  container.classList.add('slot');

  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('add-lesson-btn');
  button.textContent = 'إضافة حصة';
  button.addEventListener('click', () => {
    openLessonModal(slotKey);
  });

  container.appendChild(button);
  return container;
}

function renderSlot(slotKey) {
  const cell = scheduleCellCache.get(slotKey);
  if (!cell) {
    return;
  }

  const data = state.schedule[slotKey];
  cell.innerHTML = '';

  if (!data) {
    cell.appendChild(createEmptySlot(slotKey));
    return;
  }

  const lessonCard = createLessonCard(slotKey, data);
  cell.appendChild(lessonCard);
}

function createLessonCard(slotKey, data) {
  const lessonCard = document.createElement('div');
  lessonCard.classList.add('lesson-card');

  const subject = state.subjects.find((item) => item.id === data.subjectId);
  const teacher = state.teachers.find((item) => item.id === data.teacherId);

  const subjectEl = document.createElement('div');
  subjectEl.classList.add('lesson-subject');
  subjectEl.textContent = subject ? subject.name : 'مادة غير متوفرة';
  lessonCard.appendChild(subjectEl);

  const teacherEl = document.createElement('div');
  teacherEl.classList.add('lesson-teacher');
  teacherEl.textContent = teacher ? teacher.name : 'معلم غير متوفر';
  lessonCard.appendChild(teacherEl);

  if (data.note) {
    const noteEl = document.createElement('div');
    noteEl.classList.add('lesson-note');
    noteEl.textContent = data.note;
    lessonCard.appendChild(noteEl);
  }

  const actions = document.createElement('div');
  actions.classList.add('lesson-actions');

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'تعديل';
  editButton.addEventListener('click', () => {
    openLessonModal(slotKey);
  });
  actions.appendChild(editButton);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'حذف';
  deleteButton.classList.add('danger');
  deleteButton.addEventListener('click', () => {
    delete state.schedule[slotKey];
    renderSlot(slotKey);
    setScheduleFeedback('تم حذف الحصة من الخانة المحددة.', 'success');
  });
  actions.appendChild(deleteButton);

  lessonCard.appendChild(actions);
  return lessonCard;
}

function renderSubjects() {
  const previousValue = subjectSelect.value;
  subjectList.innerHTML = '';
  subjectSelect.innerHTML = '';

  if (!state.subjects.length) {
    subjectSelect.disabled = true;
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'الرجاء إضافة مادة أولاً';
    subjectSelect.appendChild(placeholderOption);

    const emptyMessage = document.createElement('p');
    emptyMessage.classList.add('empty-state');
    emptyMessage.textContent = 'لم يتم إضافة مواد بعد.';
    subjectList.appendChild(emptyMessage);
    return;
  }

  subjectSelect.disabled = false;
  const list = document.createElement('ul');

  state.subjects.forEach((subject) => {
    const item = document.createElement('li');
    item.textContent = subject.name;
    list.appendChild(item);

    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = subject.name;
    subjectSelect.appendChild(option);
  });

  subjectList.appendChild(list);

  if (state.subjects.some((subject) => subject.id === previousValue)) {
    subjectSelect.value = previousValue;
  } else {
    subjectSelect.value = state.subjects[0].id;
  }
}

function renderTeachers() {
  const previousValue = teacherSelect.value;
  teacherList.innerHTML = '';
  teacherSelect.innerHTML = '';

  if (!state.teachers.length) {
    teacherSelect.disabled = true;
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'الرجاء إضافة معلم أولاً';
    teacherSelect.appendChild(placeholderOption);

    const emptyMessage = document.createElement('p');
    emptyMessage.classList.add('empty-state');
    emptyMessage.textContent = 'لم يتم إضافة معلمين بعد.';
    teacherList.appendChild(emptyMessage);
    return;
  }

  teacherSelect.disabled = false;
  const list = document.createElement('ul');

  state.teachers.forEach((teacher) => {
    const item = document.createElement('li');
    item.textContent = teacher.name;
    list.appendChild(item);

    const option = document.createElement('option');
    option.value = teacher.id;
    option.textContent = teacher.name;
    teacherSelect.appendChild(option);
  });

  teacherList.appendChild(list);

  if (state.teachers.some((teacher) => teacher.id === previousValue)) {
    teacherSelect.value = previousValue;
  } else {
    teacherSelect.value = state.teachers[0].id;
  }
}

function openLessonModal(slotKey) {
  if (!state.subjects.length || !state.teachers.length) {
    setScheduleFeedback(
      'الرجاء إضافة مادة ومعلم على الأقل قبل تعيين الحصص.',
      'error'
    );
    return;
  }

  currentSlotKey = slotKey;
  const details = slotDetails[slotKey];

  if (details) {
    slotSummary.textContent = `${details.day} - الحصة ${details.period} | ${details.gradeLabel} (شعبة ${details.section})`;
  } else {
    slotSummary.textContent = '';
  }

  const existing = state.schedule[slotKey];
  lessonModalTitle.textContent = existing ? 'تعديل الحصة' : 'إضافة حصة';

  if (existing) {
    if (state.subjects.some((item) => item.id === existing.subjectId)) {
      subjectSelect.value = existing.subjectId;
    } else {
      subjectSelect.value = state.subjects[0].id;
    }

    if (state.teachers.some((item) => item.id === existing.teacherId)) {
      teacherSelect.value = existing.teacherId;
    } else {
      teacherSelect.value = state.teachers[0].id;
    }

    noteInput.value = existing.note || '';
  } else {
    subjectSelect.value = state.subjects[0].id;
    teacherSelect.value = state.teachers[0].id;
    noteInput.value = '';
  }

  lessonModal.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  subjectSelect.focus();
}

function closeLessonModal() {
  lessonModal.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
  document.body.style.overflow = '';
  lessonForm.reset();
  noteInput.value = '';
  currentSlotKey = null;
}

function setFormFeedback(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = type ? `form-feedback ${type}` : 'form-feedback';
}

function setScheduleFeedback(message, type = 'info') {
  if (!scheduleFeedback) return;
  scheduleFeedback.textContent = message;
  scheduleFeedback.className = type
    ? `schedule-feedback ${type}`
    : 'schedule-feedback';

  if (scheduleFeedbackTimeoutId) {
    clearTimeout(scheduleFeedbackTimeoutId);
  }

  if (message) {
    scheduleFeedbackTimeoutId = window.setTimeout(() => {
      scheduleFeedback.textContent = '';
      scheduleFeedback.className = 'schedule-feedback';
    }, 4000);
  }
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}
