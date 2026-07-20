/* myfaithعقيده is a self-contained prototype. The storage adapter below can be
   replaced with API requests when connecting a production authentication/database service. */
const ADMIN_EMAIL = 'probeto192@gmail.com';
const STORAGE_KEY = 'the-coptic-path-data-v1';
const USER_KEY = 'the-coptic-path-user-v1';
const mcq = (question, correct, ...otherOptions) => ({ question, options: [correct, ...otherOptions], correctIndex: 0 });

const seedData = {
  courses: [
    {
      id: 'foundations', title: 'Foundations of Faith',
      description: 'A gentle first walk through the Coptic Orthodox Christian faith.',
      pages: [
        { id: 'welcome', title: 'Welcome to myfaithعقيده', video: 'https://www.youtube.com/embed/ZDBE9kKz03Q', text: 'The Coptic Orthodox Church is one of the most ancient Christian churches in the world. Its faith is not merely a set of ideas to know, but a living encounter with the Holy Trinity.\n\nIn this first session, take a quiet moment to ask God to guide your heart. The purpose of this journey is not to rush, but to grow steadily in prayer, understanding, and love.', quiz: mcq('Is the Orthodox faith only information to memorize?', 'No — it is a living encounter with God.', 'Yes — it is only historical facts.', 'Yes — it has nothing to do with daily life.', 'Only when preparing for an exam.') },
        { id: 'faith', title: 'Faith: a living trust', video: 'https://www.youtube.com/embed/2VLPDSRL5f4', text: 'Faith is our loving response to God, who first loved us. In the Creed, the Church confesses what she has received from the apostles: one God, Father, Son, and Holy Spirit.\n\nTo believe means to trust God with the whole of our lives. We learn the words of the faith so that they may shape our prayer, choices, and relationship with others.', quiz: mcq('Faith is best described as a loving response and trust in whom?', 'God', 'Our own abilities alone', 'Changing opinions', 'Good luck') },
        { id: 'church', title: 'The Church as family', video: 'https://www.youtube.com/embed/5ke4P0Xr7Tk', text: 'The Church is the Body of Christ: a family gathered by the Lord, nourished by His sacraments, and sent into the world with His love. We do not walk alone.\n\nCoptic Christians have carried this faith through centuries of worship, service, and witness. When we gather, we join a communion that reaches across time and place.', quiz: mcq('The Church is called the Body of whom?', 'Christ', 'The apostles only', 'A single priest', 'A building') },
        { id: 'prayer', title: 'A rhythm of prayer', video: 'https://www.youtube.com/embed/n2Ji8g4x60E', text: 'Prayer is a relationship with God. The Agpeya, our book of hours, teaches us to return to the Psalms and the Gospel throughout the day. Even a short prayer said with attention can open the heart to God.\n\nStart simply: thank God, ask for mercy, and pray for someone else. Let this become a daily rhythm.', quiz: null }
      ],
      exam: [
        mcq('The Coptic Orthodox faith is meant to be a living relationship with whom?', 'God', 'Only ourselves', 'The past alone', 'No one'),
        mcq('What is one simple way to begin a rhythm of prayer?', 'Thank God, ask for mercy, and pray for another person.', 'Wait until you feel perfect.', 'Only pray when you are in church.', 'Memorize every prayer at once.')
      ]
    },
    {
      id: 'scripture', title: 'Meeting Christ in Scripture',
      description: 'Learn how the Church reads the Bible in the light of Christ.', pages: [], exam: []
    },
    {
      id: 'liturgy', title: 'The Divine Liturgy',
      description: 'Discover the beauty, movement, and meaning of Coptic worship.', pages: [], exam: []
    }
  ],
  records: {},
  users: []
};

let state = loadData();
let currentUser = loadUser();
let route = { name: 'home' };

function normalizeMcqData() {
  const convert = (question) => {
    if (!question) return null;
    if (Array.isArray(question.options) && Number.isInteger(question.correctIndex)) return question;
    const correct = question.answers?.[0] || 'Correct answer';
    return {
      question: question.question || '',
      options: [correct, 'A different teaching', 'A tradition without meaning', 'Something unrelated'],
      correctIndex: 0
    };
  };
  state.courses.forEach((course) => {
    course.pages.forEach((page) => { page.quiz = convert(page.quiz); });
    course.exam = (course.exam || []).map(convert);
  });
}

normalizeMcqData();

function emptyRecord() { return { watched: [], read: [], exams: [], quiz: [], manualPoints: 0 }; }

function normalizeLearnerData() {
  if (!state.records || typeof state.records !== 'object') state.records = {};
  Object.entries(state.records).forEach(([email, value]) => {
    const recordValue = value || {};
    state.records[email] = {
      watched: Array.isArray(recordValue.watched) ? recordValue.watched : [],
      read: Array.isArray(recordValue.read) ? recordValue.read : [],
      exams: Array.isArray(recordValue.exams) ? recordValue.exams : [],
      quiz: Array.isArray(recordValue.quiz) ? recordValue.quiz : [],
      manualPoints: Number.isFinite(recordValue.manualPoints) ? recordValue.manualPoints : 0
    };
  });
  state.users = Array.isArray(state.users) ? state.users : [];
  const knownEmails = new Set(state.users.map(user => user.email?.toLowerCase()).filter(Boolean));
  Object.keys(state.records).forEach((email) => {
    if (!knownEmails.has(email)) state.users.push({ email, name: email.split('@')[0], lastLogin: null });
  });
}

function recordForEmail(email) {
  const key = email.toLowerCase();
  if (!state.records[key]) state.records[key] = emptyRecord();
  return state.records[key];
}

function basePoints(recordValue) {
  return unique(recordValue.watched).length * 5 + unique(recordValue.quiz).length * 3 + unique(recordValue.read).length * 2 + unique(recordValue.exams).length * 6;
}

function pointsForRecord(recordValue) {
  return Math.max(0, basePoints(recordValue) + (Number(recordValue.manualPoints) || 0));
}

function learnerRoster() {
  const people = new Map();
  state.users.forEach((user) => {
    if (user?.email) people.set(user.email.toLowerCase(), { ...user, email: user.email.toLowerCase() });
  });
  Object.keys(state.records).forEach((email) => {
    if (!people.has(email)) people.set(email, { email, name: email.split('@')[0], lastLogin: null });
  });
  return [...people.values()].sort((a, b) => a.email.localeCompare(b.email));
}

function registerCurrentUser() {
  if (!currentUser) return;
  const email = currentUser.email.toLowerCase();
  let person = state.users.find(user => user.email?.toLowerCase() === email);
  if (!person) {
    person = { email, name: currentUser.name || email.split('@')[0], lastLogin: new Date().toISOString() };
    state.users.push(person);
  } else {
    person.name = currentUser.name || person.name || email.split('@')[0];
    person.lastLogin = new Date().toISOString();
  }
  recordForEmail(email);
}

normalizeLearnerData();

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seedData); }
  catch { return structuredClone(seedData); }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // When the included server is running, this also persists the complete
  // learning state in its SQLite database. Local storage remains a graceful
  // fallback for opening index.html directly.
  if (location.protocol.startsWith('http')) {
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).catch(() => {});
  }
}
function loadUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch { return null; } }
function saveUser() { if (currentUser) localStorage.setItem(USER_KEY, JSON.stringify(currentUser)); else localStorage.removeItem(USER_KEY); }
function isAdmin() { return currentUser?.email?.toLowerCase() === ADMIN_EMAIL; }
function record() {
  if (!currentUser) return emptyRecord();
  return recordForEmail(currentUser.email);
}
function unique(items) { return [...new Set(items)]; }
function points() { return pointsForRecord(record()); }
function esc(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' })[c]); }
function getCourse(id) { return state.courses.find(c => c.id === id); }
function getPage(courseId, pageId) { return getCourse(courseId)?.pages.find(p => p.id === pageId); }
function courseWatched(course) { const r = record(); return course.pages.filter(p => r.watched.includes(p.id)).length; }
function courseProgress(course) { return course.pages.length ? Math.round((courseWatched(course) / course.pages.length) * 100) : 0; }
function completedCourse(course) { return record().exams.includes(course.id); }
function initials() { return (currentUser?.name || currentUser?.email || '?').split(/[\s@]/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase(); }

function renderAccount() {
  const area = document.getElementById('accountArea');
  if (!currentUser) {
    area.innerHTML = '<button class="sign-in-button" data-action="sign-in">Sign in</button>';
    return;
  }
  area.innerHTML = `<div class="account-chip"><div class="avatar">${initials()}</div><div class="account-copy"><b>${esc(currentUser.name || currentUser.email.split('@')[0])}</b><small>${isAdmin() ? 'Academy steward' : `${points()} points`}</small></div><button class="text-button" data-action="sign-out">Sign out</button></div>`;
}

function render() {
  renderAccount();
  const app = document.getElementById('app');
  if (route.name === 'course') app.innerHTML = courseView(getCourse(route.courseId));
  else if (route.name === 'learn') app.innerHTML = lessonView(getCourse(route.courseId), getPage(route.courseId, route.pageId));
  else if (route.name === 'progress') app.innerHTML = progressView();
  else if (route.name === 'admin') app.innerHTML = adminView();
  else if (route.name === 'exam') app.innerHTML = examView(getCourse(route.courseId));
  else app.innerHTML = homeView();
  window.scrollTo({ top: 0, behavior: 'instant' });
  app.focus({ preventScroll: true });
}

function homeView() {
  const featured = state.courses.slice(0, 3).map(courseCard).join('');
  return `
    <section class="hero">
      <div class="hero-grid">
        <div>
          <p class="eyebrow">AN ANCIENT FAITH · A LIVING JOURNEY</p>
          <h1>Learn the faith.<br><em>Live the light.</em></h1>
          <p class="hero-text">A calm, guided space to discover the Coptic Orthodox Christian faith — one video, reflection, and prayerful step at a time.</p>
          <div class="hero-actions">
            <button class="primary-button" data-action="courses">Explore the sessions <span>→</span></button>
            ${currentUser ? '<button class="outline-button" data-action="progress">Continue my journey</button>' : '<button class="outline-button" data-action="sign-in">Create your learner profile</button>'}
          </div>
        </div>
        <aside class="hero-card" aria-label="Your learning path">
          <div class="hero-card-header"><small>YOUR LEARNING PATH</small><b>${currentUser ? `${points()} points` : 'Start today'}</b></div>
          <div class="journey-step"><div class="number">01</div><div><strong>Watch & listen</strong><span>Learn from every session video.</span></div></div>
          <div class="journey-step"><div class="number">02</div><div><strong>Read & reflect</strong><span>Take the teaching into your heart.</span></div></div>
          <div class="journey-step"><div class="number">03</div><div><strong>Finish & grow</strong><span>Complete the final session exam.</span></div></div>
        </aside>
      </div>
    </section>
    <section class="section">
      <div class="section-heading"><div><p class="eyebrow">START HERE</p><h2>Sessions for every step</h2></div><p>Follow a clear path through the teachings, worship, and life of the Coptic Orthodox Church.</p></div>
      <div class="course-grid">${featured}</div>
    </section>
    <section class="benefits"><div class="benefit-grid">
      <div class="benefit"><div class="benefit-icon">◉</div><h3>Learn at your pace</h3><p>Return to any teaching when you need it. Your progress stays with your learner profile.</p></div>
      <div class="benefit"><div class="benefit-icon">☩</div><h3>Rooted in the Church</h3><p>Discover the faith received from the apostles and faithfully lived in the Coptic tradition.</p></div>
      <div class="benefit"><div class="benefit-icon">✦</div><h3>See your growth</h3><p>Earn points for watching, reading, and completing each session’s final reflection.</p></div>
    </div></section>`;
}

function courseCard(course) {
  const progress = currentUser ? courseProgress(course) : 0;
  const status = completedCourse(course) ? 'Session complete' : course.pages.length ? `${course.pages.length} learning page${course.pages.length === 1 ? '' : 's'}` : 'Coming soon';
  return `<button class="course-card" data-action="open-course" data-course="${course.id}">
    <div class="course-card-top"><span class="card-status">${status}</span><strong>${esc(course.title)}</strong></div>
    <div class="course-card-body"><p>${esc(course.description)}</p><div class="course-meta"><span>${course.pages.length} video${course.pages.length === 1 ? '' : 's'}</span><span>${progress}% complete</span></div><div class="meter"><span style="width:${progress}%"></span></div></div>
  </button>`;
}

function courseView(course) {
  if (!course) return notFound();
  const watched = courseWatched(course);
  const examReady = course.pages.length > 0 && watched === course.pages.length;
  return `<div class="page-wrap">
    <div class="breadcrumb"><button data-action="home">Home</button><span>/</span><span>Sessions</span></div>
    <section class="course-hero"><p class="eyebrow">${course.pages.length ? `${course.pages.length} LEARNING PAGES` : 'SESSION'}</p><h1>${esc(course.title)}</h1><p>${esc(course.description)}</p></section>
    ${course.pages.length ? `<div class="session-layout"><div><div class="section-heading"><div><p class="eyebrow">SESSION CONTENT</p><h2>Walk through the lesson</h2></div></div><div class="lesson-list">${course.pages.map((page, i) => lessonRow(course, page, i)).join('')}</div></div>
      <aside class="session-side"><h3>Your session</h3><p>Complete every video to unlock the final exam.</p><div class="side-progress"><div class="progress-label"><span>Video progress</span><span>${watched}/${course.pages.length}</span></div><div class="progress-bar"><span style="width:${courseProgress(course)}%"></span></div></div><div class="points-callout"><b>+5</b> points per video<br><b>+3</b> points per quiz<br><b>+2</b> points per reading<br><b>+6</b> points for the exam</div>${examReady ? `<button class="primary-button full" data-action="open-exam" data-course="${course.id}">${completedCourse(course) ? 'Review final exam' : 'Take final exam'} <span>→</span></button>` : '<button class="plain-action" disabled>Final exam is locked</button>'}</aside></div>` : `<div class="empty-state"><div class="dialog-cross">☩</div><h2>This session is being prepared.</h2><p>Its learning pages will appear here when the academy steward publishes them.</p>${isAdmin() ? '<button class="primary-button" data-action="open-lesson-dialog">Add the first page <span>+</span></button>' : ''}</div>`}
  </div>`;
}

function lessonRow(course, page, index, compact = false) {
  const done = record().watched.includes(page.id);
  return `<button class="lesson-row ${done ? 'complete' : ''} ${route.pageId === page.id ? 'current' : ''}" data-action="open-lesson" data-course="${course.id}" data-page="${page.id}"><span class="lesson-no">${done ? '✓' : index + 1}</span><span class="lesson-row-copy"><b>${esc(page.title)}</b><span>${compact ? '' : 'Video · Teaching' + (page.quiz ? ' · Knowledge check' : '')}</span></span>${compact ? '' : '<span class="row-arrow">›</span>'}</button>`;
}

function mcqOptions(question, name) {
  return `<div class="mcq-options">${question.options.map((option, index) => `<label class="mcq-option"><input required type="radio" name="${esc(name)}" value="${index}" /><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></label>`).join('')}</div>`;
}

function lessonView(course, page) {
  if (!course || !page) return notFound();
  const r = record(), watched = r.watched.includes(page.id), read = r.read.includes(page.id), quizDone = r.quiz.includes(page.id);
  const embed = toEmbedUrl(page.video);
  const player = embed ? `<iframe src="${esc(embed)}" title="${esc(page.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<div class="video-fallback"><div class="play-disc">▶</div><h2>${esc(page.title)}</h2><p>Open the lesson video, then return here to mark it watched.</p><a class="watch-button" target="_blank" rel="noopener" href="${esc(page.video)}">Open video ↗</a><button class="watch-button" data-action="mark-watched" data-page="${page.id}" ${watched ? 'disabled' : ''}>${watched ? 'Video completed ✓' : 'I finished the video (+5)'}</button></div>`;
  return `<div class="learning-layout"><article>
    <div class="breadcrumb"><button data-action="open-course" data-course="${course.id}">${esc(course.title)}</button><span>/</span><span>Lesson ${course.pages.indexOf(page)+1}</span></div>
    <div class="video-wrap">${player}</div>
    ${embed ? `<div class="video-complete-bar"><button class="plain-action" data-action="mark-watched" data-page="${page.id}" ${watched ? 'disabled' : ''}>${watched ? 'Video completed ✓' : 'Mark video complete (+5 points)'}</button></div>` : ''}
    <div class="lesson-heading"><div><p class="eyebrow">LEARNING PAGE ${course.pages.indexOf(page)+1} OF ${course.pages.length}</p><h1>${esc(page.title)}</h1></div><span class="point-pill">${watched ? '5 points earned' : '+5 video points'}</span></div>
    <section class="reading-card"><h2>Read & reflect</h2><p>${esc(page.text)}</p><div class="reading-footer"><span>${read ? 'Teaching read · 2 points earned' : 'Read the teaching, then record your reflection.'}</span><button class="plain-action" data-action="mark-read" data-page="${page.id}" ${read ? 'disabled' : ''}>${read ? 'Reading completed ✓' : 'I finished reading (+2)'}</button></div></section>
    ${page.quiz ? `<section class="quiz-card"><p class="eyebrow">OPTIONAL KNOWLEDGE CHECK · ${quizDone ? '3 POINTS EARNED' : '+3 POINTS'}</p><h2>A moment to consider</h2><p>${esc(page.quiz.question)}</p>${quizDone ? '<p class="answer-feedback feedback-good">✓ Knowledge check completed · 3 points earned</p>' : `<form data-quiz-page="${page.id}">${mcqOptions(page.quiz, `quiz-${page.id}`)}<button class="plain-action" type="submit">Check answer (+3 points)</button><p class="answer-feedback" id="quiz-feedback"></p></form>`}</section>` : ''}
  </article><aside class="learning-sidebar"><h3>${esc(course.title)}</h3>${course.pages.map((p, i) => lessonRow(course, p, i, true)).join('')}<button class="sidebar-exam ${courseWatched(course) === course.pages.length ? 'unlocked' : ''}" data-action="open-exam" data-course="${course.id}">${completedCourse(course) ? '✓ Final exam completed' : courseWatched(course) === course.pages.length ? 'Final exam is ready →' : `Final exam · ${course.pages.length - courseWatched(course)} video${course.pages.length - courseWatched(course) === 1 ? '' : 's'} remaining`}</button></aside></div>`;
}

function progressView() {
  if (!currentUser) return signedOutPrompt('Keep track of your journey', 'Sign in to save your lessons, points, and completed session exams.');
  const r = record();
  const allPages = state.courses.flatMap(c => c.pages);
  return `<div class="progress-page"><div class="progress-top"><div><p class="eyebrow">MY JOURNEY</p><h1 class="page-title">Peace be with you, ${esc(currentUser.name || currentUser.email.split('@')[0])}.</h1></div><div class="total-points"><b>${points()}</b><span>points gathered</span></div></div>
    <section class="points-breakdown"><div class="points-breakdown-heading"><p class="eyebrow">YOUR POINTS</p><span>Every completed step is saved.</span></div><div class="points-breakdown-grid"><div class="point-source"><b>${unique(r.watched).length * 5}</b><span><strong>${unique(r.watched).length} videos</strong> · 5 points each</span></div><div class="point-source"><b>${unique(r.quiz).length * 3}</b><span><strong>${unique(r.quiz).length} quizzes</strong> · 3 points each</span></div><div class="point-source"><b>${unique(r.read).length * 2}</b><span><strong>${unique(r.read).length} readings</strong> · 2 points each</span></div><div class="point-source"><b>${unique(r.exams).length * 6}</b><span><strong>${unique(r.exams).length} exams</strong> · 6 points each</span></div></div></section>
    <div class="stats-grid"><div class="stat"><b>${unique(r.watched).length}</b><span>videos watched</span></div><div class="stat"><b>${unique(r.quiz).length}</b><span>quizzes completed</span></div><div class="stat"><b>${unique(r.read).length}</b><span>teachings read</span></div><div class="stat"><b>${unique(r.exams).length}</b><span>session exams completed</span></div></div>
    <p class="eyebrow">SESSION PROGRESS</p>${state.courses.map(c => `<section class="progress-course"><div class="progress-course-top"><div><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p></div><small>${completedCourse(c) ? 'Completed ✓' : `${courseProgress(c)}%`}</small></div><div class="progress-bar"><span style="width:${courseProgress(c)}%"></span></div>${c.pages.length ? `<button class="text-button" data-action="open-course" data-course="${c.id}">${completedCourse(c) ? 'Review session' : 'Continue session →'}</button>` : ''}</section>`).join('')}${isAdmin() ? '<p><button class="outline-button" data-action="admin">Open administrator area</button></p>' : ''}</div>`;
}

function adminView() {
  if (!isAdmin()) return signedOutPrompt('Administrator area', 'This area is reserved for the academy steward. Sign in with the approved account to manage sessions.');
  const allPages = state.courses.flatMap(c => c.pages);
  const allRecords = Object.values(state.records);
  const roster = learnerRoster();
  const learners = roster.filter(person => person.email !== ADMIN_EMAIL).length;
  return `<div class="admin-page"><div class="admin-head"><div><p class="eyebrow">ADMINISTRATOR AREA</p><h1 class="page-title">Shape the learning journey.</h1></div><div class="admin-actions"><button class="outline-button" data-action="open-course-dialog">New session</button><button class="outline-button" data-action="open-exam-dialog">Add exam question</button><button class="primary-button" data-action="open-lesson-dialog">Add learning page <span>+</span></button></div></div>
  <div class="admin-stats"><div class="admin-stat"><b>${state.courses.length}</b><span>sessions</span></div><div class="admin-stat"><b>${allPages.length}</b><span>learning pages</span></div><div class="admin-stat"><b>${learners}</b><span>learner records</span></div><div class="admin-stat"><b>${allRecords.reduce((sum, item) => sum + unique(item.exams || []).length, 0)}</b><span>exams completed</span></div></div>
  <p class="muted">Add a page by supplying its video, teaching text, and an optional knowledge check. Final exam questions are attached to each session.</p>
  <section class="admin-learners"><div class="admin-learners-heading"><div><p class="eyebrow">LEARNER ACCOUNTS</p><h2>Logged-in learners & points</h2></div><span>${learners} learner${learners === 1 ? '' : 's'}</span></div>${roster.length ? roster.map((person) => { const learnerRecord = recordForEmail(person.email); const manual = Number(learnerRecord.manualPoints) || 0; return `<div class="learner-row"><div class="learner-avatar">${esc((person.name || person.email).slice(0, 1).toUpperCase())}</div><div class="learner-details"><b>${esc(person.name || person.email.split('@')[0])}${person.email === ADMIN_EMAIL ? ' <small>Administrator</small>' : ''}</b><span>${esc(person.email)}${person.lastLogin ? ` · Last sign-in ${esc(new Date(person.lastLogin).toLocaleDateString())}` : ''}</span></div><div class="learner-activity"><span>Videos ${unique(learnerRecord.watched).length} · Quizzes ${unique(learnerRecord.quiz).length}</span>${manual ? `<small>${manual > 0 ? '+' : ''}${manual} manual adjustment</small>` : ''}</div><div class="learner-points"><b>${pointsForRecord(learnerRecord)}</b><span>points</span></div><div class="point-controls"><button data-action="adjust-points" data-email="${esc(person.email)}" data-delta="-1" aria-label="Deduct one point">−1</button><button data-action="adjust-points" data-email="${esc(person.email)}" data-delta="1" aria-label="Add one point">+1</button><button class="reset-points" data-action="reset-points" data-email="${esc(person.email)}">Reset</button></div></div>`; }).join('') : '<p class="admin-empty">No learner has signed in yet.</p>'}</section>
  ${state.courses.length ? state.courses.map(c => `<section class="admin-course"><div class="admin-course-head"><div><h3>${esc(c.title)}</h3><p>${esc(c.description)} · ${c.exam.length} final question${c.exam.length === 1 ? '' : 's'}</p></div><button class="danger-button" data-action="remove-course" data-course="${c.id}">Remove session</button></div>${c.pages.length ? c.pages.map((p,i) => `<div class="admin-page-row"><span class="small-num">${i+1}</span><b>${esc(p.title)}</b><span>${p.quiz ? 'Quiz included' : 'No quiz'}</span><button class="danger-button" data-action="remove-page" data-course="${c.id}" data-page="${p.id}">Remove</button></div>`).join('') : '<p class="admin-empty">No learning pages yet.</p>'}</section>`).join('') : '<div class="empty-state"><div class="dialog-cross">☩</div><h2>No sessions yet.</h2><p>Create a new session whenever you are ready to add lessons.</p><button class="primary-button" data-action="open-course-dialog">Create a session <span>+</span></button></div>'}</div>`;
}

function examView(course) {
  if (!course) return notFound();
  if (!currentUser) return signedOutPrompt('Final session exam', 'Sign in before taking the final session exam so your result and points can be saved.');
  const ready = course.pages.length && courseWatched(course) === course.pages.length;
  const done = completedCourse(course);
  if (!ready && !done) return `<div class="exam-page"><div class="exam-locked"><div class="dialog-cross">☩</div><h1>Almost there.</h1><p>Finish all ${course.pages.length} videos in this session to unlock the final exam.</p><button class="primary-button" data-action="open-course" data-course="${course.id}">Return to session <span>→</span></button></div></div>`;
  if (!course.exam.length) return `<div class="exam-page"><div class="exam-locked"><div class="dialog-cross">☩</div><h1>The final reflection is being prepared.</h1><p>Please return soon. Your completed video progress is already saved.</p><button class="primary-button" data-action="open-course" data-course="${course.id}">Return to session <span>→</span></button></div></div>`;
  return `<div class="exam-page"><div class="breadcrumb"><button data-action="open-course" data-course="${course.id}">${esc(course.title)}</button><span>/</span><span>Final exam</span></div><form class="exam-card" data-exam-course="${course.id}"><p class="eyebrow">FINAL SESSION EXAM</p><h1>${done ? 'Your final reflection' : 'Gather what you have learned.'}</h1><p class="exam-intro">Choose the best answer for each question. A successful submission adds 6 points to your journey.${done ? ' You have already earned these points.' : ''}</p>${course.exam.map((q, i) => `<div class="exam-question"><label>${i+1}. ${esc(q.question)}</label>${done ? '<p class="answer-feedback feedback-good">Answered ✓</p>' : mcqOptions(q, `exam-${q.id}`)}</div>`).join('')}${done ? '<p class="answer-feedback feedback-good">✓ Final exam complete · 6 points earned</p>' : '<button class="primary-button full" type="submit">Submit my final exam <span>→</span></button>'}</form></div>`;
}

function signedOutPrompt(title, description) { return `<div class="page-wrap"><div class="empty-state"><div class="dialog-cross">☩</div><h2>${esc(title)}</h2><p>${esc(description)}</p><button class="primary-button" data-action="sign-in">Sign in to continue <span>→</span></button></div></div>`; }
function notFound() { return `<div class="page-wrap"><div class="empty-state"><div class="dialog-cross">☩</div><h2>We could not find that page.</h2><button class="primary-button" data-action="home">Return home <span>→</span></button></div></div>`; }

function toEmbedUrl(url) {
  if (!url) return '';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? '' : url;
}
function toast(message, gold = false) { const el = document.createElement('div'); el.className = `toast${gold ? ' gold' : ''}`; el.textContent = message; document.getElementById('toastRegion').append(el); setTimeout(() => el.remove(), 3400); }
function requireUser() { if (currentUser) return true; document.getElementById('authDialog').showModal(); return false; }
function addUnique(list, value) { if (!list.includes(value)) list.push(value); }

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'home') route = { name: 'home' };
  if (action === 'courses') route = { name: 'home' };
  if (action === 'progress') route = { name: 'progress' };
  if (action === 'admin') route = { name: 'admin' };
  if (action === 'open-course') route = { name: 'course', courseId: button.dataset.course };
  if (action === 'open-lesson') route = { name: 'learn', courseId: button.dataset.course, pageId: button.dataset.page };
  if (action === 'open-exam') route = { name: 'exam', courseId: button.dataset.course };
  if (action === 'sign-in') { document.getElementById('authDialog').showModal(); return; }
  if (action === 'sign-out') { currentUser = null; saveUser(); toast('You have been signed out.'); route = { name: 'home' }; }
  if (action === 'adjust-points') {
    if (!isAdmin()) return; const learnerRecord = recordForEmail(button.dataset.email); const base = basePoints(learnerRecord); const delta = Number(button.dataset.delta); learnerRecord.manualPoints = Math.max(-base, (Number(learnerRecord.manualPoints) || 0) + delta); saveData(); toast(`${delta > 0 ? 'Added' : 'Deducted'} 1 point.`); render(); return;
  }
  if (action === 'reset-points') {
    if (!isAdmin()) return; const learnerRecord = recordForEmail(button.dataset.email); if (confirm(`Reset ${button.dataset.email}'s total points to zero?`)) { learnerRecord.manualPoints = -basePoints(learnerRecord); saveData(); toast('Points reset to zero.'); render(); } return;
  }
  if (action === 'close-dialog') { button.closest('dialog').close(); return; }
  if (action === 'mark-watched') {
    if (!requireUser()) return; const r = record(); const wasDone = r.watched.includes(button.dataset.page); addUnique(r.watched, button.dataset.page); saveData(); render(); if (!wasDone) toast('+5 points for completing the video.', true); return;
  }
  if (action === 'mark-read') {
    if (!requireUser()) return; const r = record(); const wasDone = r.read.includes(button.dataset.page); addUnique(r.read, button.dataset.page); saveData(); render(); if (!wasDone) toast('+2 points for reading the teaching.', true); return;
  }
  if (action === 'open-lesson-dialog') { if (!isAdmin()) return; if (!fillCourseSelect('lessonCourse')) { toast('Create a session before adding a learning page.'); document.getElementById('newCourseDialog').showModal(); return; } document.getElementById('adminLessonDialog').showModal(); return; }
  if (action === 'open-exam-dialog') { if (!isAdmin()) return; if (!fillCourseSelect('examCourse')) { toast('Create a session before adding its final exam.'); document.getElementById('newCourseDialog').showModal(); return; } document.getElementById('adminExamDialog').showModal(); return; }
  if (action === 'open-course-dialog') { if (!isAdmin()) return; document.getElementById('newCourseDialog').showModal(); return; }
  if (action === 'remove-page') {
    if (!isAdmin()) return; const course = getCourse(button.dataset.course), page = getPage(button.dataset.course, button.dataset.page); if (page && confirm(`Remove “${page.title}”? This cannot be undone.`)) { course.pages = course.pages.filter(p => p.id !== page.id); saveData(); toast('Learning page removed.'); render(); } return;
  }
  if (action === 'remove-course') {
    if (!isAdmin()) return; const course = getCourse(button.dataset.course); if (course && confirm(`Remove the entire “${course.title}” session? This also removes its lessons and exam questions.`)) { state.courses = state.courses.filter(c => c.id !== course.id); saveData(); toast('Session removed.'); render(); } return;
  }
  render();
});

document.addEventListener('submit', (event) => {
  if (event.target.id === 'authForm') {
    event.preventDefault(); const email = document.getElementById('emailInput').value.trim().toLowerCase(); const name = document.getElementById('nameInput').value.trim(); currentUser = { email, name: name || email.split('@')[0] }; registerCurrentUser(); saveUser(); saveData(); document.getElementById('authDialog').close(); toast(isAdmin() ? 'Welcome, academy steward.' : 'Your learner profile is ready.'); render(); return;
  }
  if (event.target.matches('[data-quiz-page]')) {
    event.preventDefault(); if (!requireUser()) return; const pageId = event.target.dataset.quizPage; const course = state.courses.find(c => c.pages.some(p => p.id === pageId)); const page = getPage(course.id, pageId); const answer = event.target.querySelector('input:checked'); const feedback = document.getElementById('quiz-feedback');
    if (answer && Number(answer.value) === page.quiz.correctIndex) { const wasDone = record().quiz.includes(page.id); addUnique(record().quiz, page.id); saveData(); feedback.className = 'answer-feedback feedback-good'; feedback.textContent = wasDone ? '✓ Knowledge check already completed.' : '✓ Beautiful — that is correct. You earned 3 points.'; if (!wasDone) toast('+3 points for completing the quiz.', true); setTimeout(render, 650); } else { feedback.className = 'answer-feedback feedback-bad'; feedback.textContent = 'Not quite. Return to the teaching and try once more.'; } return;
  }
  if (event.target.matches('[data-exam-course]')) {
    event.preventDefault(); const course = getCourse(event.target.dataset.examCourse); const answers = [...event.target.querySelectorAll('.exam-question')].map(question => question.querySelector('input:checked')); const correct = course.exam.every((q, i) => answers[i] && Number(answers[i].value) === q.correctIndex);
    if (correct) { addUnique(record().exams, course.id); saveData(); toast('+6 points for completing the final exam.', true); render(); } else { toast('Some answers need another look. Review the session and try again.'); } return;
  }
  if (event.target.id === 'newCourseForm') {
    event.preventDefault(); if (!isAdmin()) return; const title = document.getElementById('courseTitle').value.trim(), description = document.getElementById('courseDescription').value.trim(); const id = slugId(title); state.courses.push({ id, title, description, pages: [], exam: [] }); saveData(); event.target.reset(); document.getElementById('newCourseDialog').close(); toast('New session created.'); render(); return;
  }
  if (event.target.id === 'adminLessonForm') {
    event.preventDefault(); if (!isAdmin()) return; const newSessionName = document.getElementById('newLessonSessionName').value.trim(); let course = getCourse(document.getElementById('lessonCourse').value); const title = document.getElementById('lessonTitle').value.trim(), question = document.getElementById('quizQuestion').value.trim(), options = ['quizOptionA', 'quizOptionB', 'quizOptionC', 'quizOptionD'].map(id => document.getElementById(id).value.trim());
    if (newSessionName) {
      course = state.courses.find(item => item.title.toLowerCase() === newSessionName.toLowerCase());
      if (!course) {
        course = { id: slugId(newSessionName), title: newSessionName, description: 'A Coptic Orthodox learning session.', pages: [], exam: [] };
        state.courses.push(course);
      }
    }
    if (!course) { toast('Choose an existing session or type a name for a new one.'); return; }
    const hasQuizContent = Boolean(question || options.some(Boolean));
    if (hasQuizContent && (!question || options.some(option => !option))) { toast('A knowledge check needs one question and all four answer options.'); return; }
    course.pages.push({ id: `${slugId(title)}-${Date.now()}`, title, video: document.getElementById('lessonVideo').value.trim(), text: document.getElementById('lessonText').value.trim(), quiz: question ? { question, options, correctIndex: Number(document.getElementById('quizCorrect').value) } : null }); saveData(); event.target.reset(); document.getElementById('adminLessonDialog').close(); toast('Learning page added to the session.'); render(); return;
  }
  if (event.target.id === 'adminExamForm') {
    event.preventDefault(); if (!isAdmin()) return; const course = getCourse(document.getElementById('examCourse').value), options = ['examOptionA', 'examOptionB', 'examOptionC', 'examOptionD'].map(id => document.getElementById(id).value.trim()); course.exam.push({ id: `exam-${Date.now()}`, question: document.getElementById('examQuestion').value.trim(), options, correctIndex: Number(document.getElementById('examCorrect').value) }); saveData(); event.target.reset(); document.getElementById('adminExamDialog').close(); toast('Final exam question added.'); render(); return;
  }
});
function fillCourseSelect(id) {
  const select = document.getElementById(id);
  if (!state.courses.length) {
    select.innerHTML = '<option value="">No sessions available</option>';
    select.disabled = true;
    return false;
  }
  select.disabled = false;
  select.innerHTML = state.courses.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
  select.selectedIndex = 0;
  return true;
}
function slugId(value) { return `${value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'session'}-${Date.now()}`; }

async function initialize() {
  // Prefer shared SQLite-backed state when the app is served through server.mjs.
  // A direct file preview continues to work entirely in the browser.
  if (location.protocol.startsWith('http')) {
    try {
      const response = await fetch('/api/state');
      const remoteState = response.ok ? await response.json() : null;
      if (remoteState && Array.isArray(remoteState.courses) && remoteState.records) {
        state = remoteState;
        normalizeMcqData();
        normalizeLearnerData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch { /* Keep the local browser copy if the server is unavailable. */ }
  }
  render();
}

initialize();
