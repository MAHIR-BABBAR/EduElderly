import {
  authApi,
  courseApi,
  enrollmentApi,
  quizApi,
  paymentApi,
  getToken,
  setToken,
  clearToken,
} from './api.js';

const views = {
  auth: document.getElementById('view-auth'),
  courses: document.getElementById('view-courses'),
  course: document.getElementById('view-course'),
  quiz: document.getElementById('view-quiz'),
  result: document.getElementById('view-result'),
  admin: document.getElementById('view-admin'),
};

const els = {
  status: document.getElementById('status-bar'),
  navUser: document.getElementById('nav-user'),
  btnLogout: document.getElementById('btn-logout'),
  btnContrast: document.getElementById('btn-contrast'),
  courseList: document.getElementById('course-list'),
  courseDetail: document.getElementById('course-detail'),
  quizContainer: document.getElementById('quiz-container'),
  resultContainer: document.getElementById('result-container'),
  authForm: document.getElementById('auth-form'),
  authTitle: document.getElementById('auth-title'),
  authMode: document.getElementById('auth-mode'),
  authSubmit: document.getElementById('auth-submit'),
  authToggle: document.getElementById('auth-toggle'),
  otpGroup: document.getElementById('otp-group'),
  nameGroup: document.getElementById('name-group'),
  authError: document.getElementById('auth-error'),
  btnAdmin: document.getElementById('btn-admin'),
  adminPayments: document.getElementById('admin-payments'),
};

const state = {
  authStep: 'login',
  pendingEmail: '',
  pendingUserId: '',
  courses: [],
  currentCourse: null,
  enrollments: [],
  currentQuiz: null,
  selectedAnswers: {},
  pendingPayment: null,
  userRole: null,
};

function getUserFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

function showStatus(message, type = 'info') {
  els.status.textContent = message;
  els.status.className = `alert alert-${type}`;
  els.status.classList.remove('hidden');
}

function clearStatus() {
  els.status.classList.add('hidden');
}

function showView(name) {
  Object.values(views).forEach((v) => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
}

function updateNav() {
  const loggedIn = Boolean(getToken());
  const user = getUserFromToken();
  state.userRole = user?.role ?? null;

  els.btnLogout.classList.toggle('hidden', !loggedIn);
  els.btnAdmin.classList.toggle('hidden', !loggedIn || state.userRole !== 'admin');
  els.navUser.textContent = loggedIn
    ? state.userRole === 'admin'
      ? 'Admin'
      : 'Signed in'
    : 'Guest';
}

async function loadCourses() {
  const res = await courseApi.list();
  state.courses = res.data?.courses || res.data || [];
  renderCourseList();
}

async function loadEnrollments() {
  try {
    const res = await enrollmentApi.list();
    const items = res.data?.enrollments || res.data || [];
    state.enrollments = items;
  } catch {
    state.enrollments = [];
  }
}

function isEnrolled(courseId) {
  return state.enrollments.some((e) => e.courseId === courseId && e.status === 'active');
}

function renderCourseList() {
  els.courseList.innerHTML = '';
  for (const course of state.courses) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      ${course.thumbnailUrl ? `<img class="course-thumb" src="${course.thumbnailUrl}" alt="">` : ''}
      <h2>${escapeHtml(course.title)}</h2>
      <p class="muted">${escapeHtml(course.description || '').slice(0, 160)}...</p>
      <p>
        <span class="badge">${escapeHtml(course.difficulty || 'beginner')}</span>
        ${course.isPaid ? `<span class="badge">$${course.price}</span>` : '<span class="badge">Free</span>'}
      </p>
      <button class="btn btn-primary btn-block" data-course-id="${course.courseId}">View course</button>
    `;
    card.querySelector('button').addEventListener('click', () => openCourse(course.courseId));
    els.courseList.appendChild(card);
  }
}

async function openCourse(courseId) {
  clearStatus();
  const res = await courseApi.get(courseId);
  state.currentCourse = res.data;
  await loadEnrollments();
  await renderCourseDetail();
  showView('course');
  location.hash = `course/${courseId}`;
}

async function loadPendingPayment(courseId) {
  try {
    const res = await paymentApi.myTransactions();
    const txs = res.data?.transactions || [];
    const pending = txs.find((t) => t.courseId === courseId && t.status === 'pending');
    state.pendingPayment = pending || null;
  } catch {
    state.pendingPayment = null;
  }
}

async function renderCourseDetail() {
  const course = state.currentCourse;
  const enrolled = isEnrolled(course.courseId);

  if (!enrolled && course.isPaid) {
    await loadPendingPayment(course.courseId);
  } else {
    state.pendingPayment = null;
  }

  let quizzesHtml = '';
  if (enrolled) {
    try {
      const qRes = await quizApi.byCourse(course.courseId);
      const quizzes = qRes.data?.quizzes || [];
      if (quizzes.length === 0) {
        quizzesHtml = '<p class="muted">No quizzes available for this course yet.</p>';
      } else {
        quizzesHtml = '<h3>Module quizzes</h3><ul>';
        for (const quiz of quizzes) {
          quizzesHtml += `<li style="margin-bottom:0.75rem">
            <strong>${escapeHtml(quiz.title)}</strong>
            <br><span class="muted">Pass: ${quiz.passThreshold}% · Attempts allowed: ${quiz.maxAttempts}</span>
            <br><button class="btn btn-primary" data-quiz-id="${quiz.quizId}" style="margin-top:0.5rem">Take quiz</button>
          </li>`;
        }
        quizzesHtml += '</ul>';
      }
    } catch (err) {
      quizzesHtml = `<p class="alert alert-error">${escapeHtml(err.message)}</p>`;
    }
  }

  const pending = state.pendingPayment;
  let enrollSection = '';
  if (enrolled) {
    enrollSection = '<span class="badge" style="margin-left:0.5rem">Enrolled</span>';
  } else if (pending) {
    enrollSection = `
      <div class="card alert-info" style="margin-top:1rem">
        <h3>Payment pending</h3>
        <p>An administrator will approve your payment.</p>
        <p><strong>Order:</strong> <code>${escapeHtml(pending.orderId)}</code></p>
        <p><strong>Amount:</strong> $${Number(pending.amount).toFixed(2)} ${escapeHtml(pending.currency || 'USD')}</p>
        <button class="btn btn-secondary" id="btn-refresh-payment" type="button">Check payment status</button>
      </div>`;
  } else if (course.isPaid) {
    enrollSection = `<button class="btn btn-primary" id="btn-enroll" style="margin-left:0.5rem">Enroll — $${course.price}</button>`;
  } else {
    enrollSection = `<button class="btn btn-primary" id="btn-enroll" style="margin-left:0.5rem">Enroll (free)</button>`;
  }

  els.courseDetail.innerHTML = `
    ${course.thumbnailUrl ? `<img class="course-thumb" src="${course.thumbnailUrl}" alt="">` : ''}
    <h2>${escapeHtml(course.title)}</h2>
    <p>${escapeHtml(course.description || '')}</p>
    <p>
      <button class="btn btn-secondary" id="btn-back-courses">← All courses</button>
      ${enrollSection}
    </p>
    <div class="card">
      <h3>Modules</h3>
      <ol>
        ${(course.modules || [])
          .map((m) => `<li><strong>${escapeHtml(m.title)}</strong> — ${(m.topics || []).length} topics</li>`)
          .join('')}
      </ol>
    </div>
    <div class="card">${quizzesHtml}</div>
  `;

  els.courseDetail.querySelector('#btn-back-courses').addEventListener('click', () => {
    showView('courses');
    location.hash = 'courses';
  });

  const enrollBtn = els.courseDetail.querySelector('#btn-enroll');
  if (enrollBtn) {
    enrollBtn.addEventListener('click', async () => {
      try {
        const res = await enrollmentApi.enroll(course.courseId);
        if (res.httpStatus === 202 && res.data?.requiresPayment) {
          const checkout = res.data.checkout || {};
          state.pendingPayment = {
            orderId: checkout.orderId,
            courseId: course.courseId,
            amount: course.price,
            currency: 'USD',
            status: 'pending',
          };
          showStatus(
            'Payment request submitted. An administrator will approve your payment.',
            'info',
          );
          await renderCourseDetail();
          return;
        }
        showStatus('Enrolled successfully! Quizzes are now available below.', 'success');
        await loadEnrollments();
        await renderCourseDetail();
      } catch (err) {
        showStatus(err.message, 'error');
      }
    });
  }

  const refreshBtn = els.courseDetail.querySelector('#btn-refresh-payment');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadEnrollments();
      await loadPendingPayment(course.courseId);
      if (isEnrolled(course.courseId)) {
        showStatus('Payment approved — you are now enrolled!', 'success');
      } else if (state.pendingPayment) {
        showStatus('Payment still pending. Please wait for admin approval.', 'info');
      } else {
        showStatus('No pending payment found for this course.', 'info');
      }
      await renderCourseDetail();
    });
  }

  els.courseDetail.querySelectorAll('[data-quiz-id]').forEach((btn) => {
    btn.addEventListener('click', () => openQuiz(btn.dataset.quizId));
  });
}

async function openQuiz(quizId) {
  clearStatus();
  state.selectedAnswers = {};
  const res = await quizApi.get(quizId);
  state.currentQuiz = res.data;
  renderQuiz();
  showView('quiz');
  location.hash = `quiz/${quizId}`;
}

function renderQuiz() {
  const quiz = state.currentQuiz;
  let html = `
    <p><button class="btn btn-secondary" id="btn-back-course">← Back to course</button></p>
    <h2>${escapeHtml(quiz.title)}</h2>
    <p class="muted">Answer all questions. You need ${quiz.passThreshold}% to pass.</p>
    <form id="quiz-form">
  `;

  for (const q of quiz.questions || []) {
    html += `<div class="card" data-question-id="${q.questionId}">
      <h3>${escapeHtml(q.prompt)}</h3>`;
    q.options.forEach((opt, idx) => {
      html += `
        <label class="quiz-option">
          <input type="radio" name="${q.questionId}" value="${idx}" required>
          <span>${escapeHtml(opt)}</span>
        </label>`;
    });
    html += '</div>';
  }

  html += '<button type="submit" class="btn btn-primary btn-block">Submit answers</button></form>';
  els.quizContainer.innerHTML = html;

  els.quizContainer.querySelector('#btn-back-course').addEventListener('click', () => {
    openCourse(quiz.courseId);
  });

  els.quizContainer.querySelector('#quiz-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const answers = (quiz.questions || []).map((q) => {
      const selected = els.quizContainer.querySelector(`input[name="${q.questionId}"]:checked`);
      return {
        questionId: q.questionId,
        selectedIndex: Number(selected.value),
      };
    });

    try {
      const res = await quizApi.submit(quiz.quizId, answers);
      renderResult(res.data);
      showView('result');
    } catch (err) {
      showStatus(err.message, 'error');
    }
  });
}

function renderResult(data) {
  const passed = data.passed;
  els.resultContainer.innerHTML = `
    <div class="card ${passed ? 'alert-success' : 'alert-error'}">
      <h2>${passed ? 'You passed!' : 'Not quite — try again'}</h2>
      <p><strong>Score:</strong> ${data.score}%</p>
      <p class="muted">Pass threshold applies to this quiz.</p>
    </div>
    <div class="card">
      <h3>Question feedback</h3>
      <ul>
        ${(data.questionFeedback || [])
          .map(
            (f) =>
              `<li>${f.correct ? '✓' : '✗'} Question ${escapeHtml(f.questionId.slice(0, 8))}… — ${
                f.correct ? 'Correct' : 'Incorrect'
              }</li>`,
          )
          .join('')}
      </ul>
    </div>
    <button class="btn btn-primary" id="btn-result-back">Back to course</button>
    <button class="btn btn-secondary" id="btn-result-retry">Try quiz again</button>
  `;

  els.resultContainer.querySelector('#btn-result-back').addEventListener('click', () => {
    openCourse(state.currentQuiz.courseId);
  });
  els.resultContainer.querySelector('#btn-result-retry').addEventListener('click', () => {
    openQuiz(state.currentQuiz.quizId);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setAuthMode(mode) {
  state.authStep = mode;
  const isRegister = mode === 'register';
  const isOtp = mode === 'otp-login';
  const isVerifyToken = mode === 'verify-token';

  els.authTitle.textContent = isRegister
    ? 'Create account'
    : isOtp
      ? 'Enter login code (2FA)'
      : isVerifyToken
        ? 'Verify your email'
        : 'Sign in';
  els.nameGroup.classList.toggle('hidden', !isRegister);
  els.otpGroup.classList.toggle('hidden', !isOtp && !isVerifyToken);
  document.getElementById('otp').labels?.[0] &&
    (document.querySelector('#otp-group label').textContent = isVerifyToken
      ? 'Verification token from email link'
      : 'Login verification code');
  els.authSubmit.textContent = isRegister
    ? 'Register'
    : isOtp || isVerifyToken
      ? 'Verify'
      : 'Sign in';
  els.authToggle.textContent = isRegister
    ? 'Already have an account? Sign in'
    : isOtp || isVerifyToken
      ? 'Back to sign in'
      : 'Need an account? Register';
  els.authError.classList.add('hidden');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  els.authError.classList.add('hidden');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value.trim();
  const otp = document.getElementById('otp').value.trim();

  try {
    if (state.authStep === 'register') {
      await authApi.register({ email, password, name });
      showStatus('Registered. Paste the verification token from your email link below, or use the demo account.', 'info');
      setAuthMode('verify-token');
      return;
    }

    if (state.authStep === 'verify-token') {
      await authApi.verifyEmail(otp);
      showStatus('Email verified. You can sign in now.', 'success');
      setAuthMode('login');
      return;
    }

    if (state.authStep === 'otp-login') {
      const res = await authApi.verifyOtp({ email: state.pendingEmail || email, otp });
      setToken(res.data.accessToken);
      updateNav();
      await bootApp();
      return;
    }

    const res = await authApi.login({ email, password });
    if (res.requiresOtp) {
      state.pendingEmail = email;
      setAuthMode('otp-login');
      showStatus('Two-factor login enabled. Enter the OTP from your email.', 'info');
      return;
    }
    if (res.data?.accessToken) {
      setToken(res.data.accessToken);
      updateNav();
      await bootApp();
    }
  } catch (err) {
    els.authError.textContent = err.message;
    els.authError.classList.remove('hidden');
  }
}

async function renderAdminPayments() {
  clearStatus();
  els.adminPayments.innerHTML = '<p class="muted">Loading pending payments…</p>';

  try {
    const res = await paymentApi.adminOrders('pending');
    const orders = res.data?.orders || [];

    if (orders.length === 0) {
      els.adminPayments.innerHTML = `
        <p><button class="btn btn-secondary" id="btn-admin-back">← Course catalog</button></p>
        <p class="muted">No pending payments.</p>`;
    } else {
      let html = `
        <p><button class="btn btn-secondary" id="btn-admin-back">← Course catalog</button></p>
        <h2>Pending payments</h2>
        <p class="muted">Approve or reject learner payment requests.</p>
        <div class="grid">`;

      for (const order of orders) {
        html += `
          <article class="card" data-order-id="${escapeHtml(order.orderId)}">
            <p><strong>Order:</strong> <code>${escapeHtml(order.orderId)}</code></p>
            <p><strong>Learner:</strong> ${escapeHtml(order.userId)}</p>
            <p><strong>Course:</strong> ${escapeHtml(order.courseId)}</p>
            <p><strong>Amount:</strong> $${Number(order.amount).toFixed(2)} ${escapeHtml(order.currency || 'USD')}</p>
            <p>
              <button class="btn btn-primary btn-approve" type="button">Approve</button>
              <button class="btn btn-secondary btn-reject" type="button" style="margin-left:0.5rem">Reject</button>
            </p>
          </article>`;
      }

      html += '</div>';
      els.adminPayments.innerHTML = html;
    }

    els.adminPayments.querySelector('#btn-admin-back')?.addEventListener('click', () => {
      showView('courses');
      location.hash = 'courses';
    });

    els.adminPayments.querySelectorAll('.btn-approve').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[data-order-id]');
        const orderId = card.dataset.orderId;
        try {
          await paymentApi.updateOrderStatus(orderId, 'success');
          showStatus(`Payment ${orderId.slice(0, 8)}… approved.`, 'success');
          await renderAdminPayments();
        } catch (err) {
          showStatus(err.message, 'error');
        }
      });
    });

    els.adminPayments.querySelectorAll('.btn-reject').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[data-order-id]');
        const orderId = card.dataset.orderId;
        try {
          await paymentApi.updateOrderStatus(orderId, 'failed');
          showStatus(`Payment ${orderId.slice(0, 8)}… rejected.`, 'info');
          await renderAdminPayments();
        } catch (err) {
          showStatus(err.message, 'error');
        }
      });
    });
  } catch (err) {
    els.adminPayments.innerHTML = `
      <p><button class="btn btn-secondary" id="btn-admin-back">← Course catalog</button></p>
      <p class="alert alert-error">${escapeHtml(err.message)}</p>`;
    els.adminPayments.querySelector('#btn-admin-back')?.addEventListener('click', () => {
      showView('courses');
      location.hash = 'courses';
    });
  }
}

function openAdminPanel() {
  showView('admin');
  location.hash = 'admin/payments';
  renderAdminPayments();
}

async function bootApp() {
  clearStatus();
  showView('courses');
  await loadEnrollments();
  await loadCourses();
  location.hash = 'courses';
}

async function init() {
  updateNav();

  const params = new URLSearchParams(window.location.search);
  const verifyToken = params.get('token');
  if (verifyToken) {
    showView('auth');
    setAuthMode('verify-token');
    document.getElementById('otp').value = verifyToken;
    showStatus('Email verification link detected. Click Verify to continue.', 'info');
  }

  els.btnLogout.addEventListener('click', () => {
    clearToken();
    state.userRole = null;
    state.pendingPayment = null;
    updateNav();
    showView('auth');
    setAuthMode('login');
    location.hash = 'auth';
  });

  els.btnAdmin.addEventListener('click', () => {
    openAdminPanel();
  });

  els.btnContrast.addEventListener('click', () => {
    document.body.classList.toggle('high-contrast');
  });

  els.authForm.addEventListener('submit', handleAuthSubmit);
  els.authToggle.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.authStep === 'otp-login' || state.authStep === 'verify-token') {
      setAuthMode('login');
    } else if (state.authStep === 'register') {
      setAuthMode('login');
    } else {
      setAuthMode('register');
    }
  });

  if (getToken()) {
    try {
      await bootApp();
      return;
    } catch {
      clearToken();
    }
  }

  showView('auth');
  setAuthMode('login');
}

init();
