/**
 * OBSIDIAN ATELIER - Front-end Engine (Рефакторинг v2.0)
 * Безупречная логика Before/After без искажений, квиз, даты и бронирование
 */

document.addEventListener('DOMContentLoaded', () => {
  initBeforeAfterSlider();
  initQuizCalculator();
  initDatePicker();
  initFaqAccordion();
  initBookingForms();
  initGlowCards();
});

// Функция считывания времени с устройства клиента с fallback на Новосибирское время (UTC+7)
function getDeviceTimestamp() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const localTimeStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    let tz = 'Asia/Novosibirsk';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Novosibirsk';
    } catch (e) {}

    return {
      client_time: localTimeStr,
      client_tz: tz
    };
  } catch (err) {
    return { client_time: null, client_tz: 'Asia/Novosibirsk' };
  }
}

/* ==========================================================================
   1. ИНТЕРАКТИВНЫЙ СЛАЙДЕР «ДО / ПОСЛЕ» (РЕФАКТОРИНГ: БЕЗ ИСКАЖЕНИЙ)
   ========================================================================== */
function initBeforeAfterSlider() {
  const box = document.getElementById('paint-comparison');
  const slider = document.getElementById('ba-range-slider');

  if (!box || !slider) return;

  function updateSliderPosition(value) {
    let pos = parseFloat(value);
    if (isNaN(pos)) pos = 50;
    if (pos < 0) pos = 0;
    if (pos > 100) pos = 100;

    box.style.setProperty('--slider-pos', pos);
  }

  // При изменении ползунка
  slider.addEventListener('input', (e) => {
    updateSliderPosition(e.target.value);
  });

  slider.addEventListener('change', (e) => {
    updateSliderPosition(e.target.value);
  });

  // Клик или свайп по любой части контейнера
  box.addEventListener('pointerdown', (e) => {
    if (e.target !== slider) {
      const rect = box.getBoundingClientRect();
      const pos = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      slider.value = pos;
      updateSliderPosition(pos);
    }
  });

  // Инициализация по центру (50%)
  updateSliderPosition(50);
}

/* ==========================================================================
   2. ИНТЕРАКТИВНЫЙ КАЛЬКУЛЯТОР / КВИЗ ПОДБОРА ЗАЩИТЫ
   ========================================================================== */
function initQuizCalculator() {
  const quizForm = document.getElementById('quiz-calculator-form');
  if (!quizForm) return;

  const steps = quizForm.querySelectorAll('.quiz-step-pane');
  const stepIndicator = document.getElementById('quiz-step-num');
  const progressFill = document.getElementById('quiz-progress-fill');
  const btnNext = document.getElementById('quiz-btn-next');
  const btnPrev = document.getElementById('quiz-btn-prev');
  const estimateDisplay = document.getElementById('quiz-dynamic-price');

  let currentStep = 1;
  const totalSteps = 5;

  // Модель данных квиза
  const quizState = {
    carClass: 'coupe',
    carClassName: 'Спорткупе / Седан (Porsche 911 / BMW M5)',
    condition: 'new',
    conditionName: 'Новый из салона (0-500 км)',
    package: 'total_armor',
    packageName: 'Total Armor Elite (Полный полиуретан 200 µm)',
    options: ['glass_clearplex', 'leather_ceramic'],
    optionsNames: ['Бронирование лобового ClearPlex', 'Керамика кожи салона'],
    basePrice: 320000,
    finalPrice: 375000
  };

  const classMultipliers = {
    coupe: 1.0,
    suv: 1.15,
    hyper: 1.35
  };

  const packageBasePrices = {
    risk_zones: 145000,
    total_armor: 320000,
    satin_matte: 360000,
    ceramic_only: 95000
  };

  const optionPrices = {
    glass_clearplex: 35000,
    leather_ceramic: 28000,
    antichrome: 30000,
    interior_screen_ppf: 18000
  };

  function updatePricing() {
    const base = packageBasePrices[quizState.package] || 320000;
    const mult = classMultipliers[quizState.carClass] || 1.0;
    
    let optionsTotal = 0;
    quizState.options.forEach(opt => {
      optionsTotal += (optionPrices[opt] || 0);
    });

    const calculated = Math.round((base * mult + optionsTotal) / 1000) * 1000;
    quizState.finalPrice = calculated;

    if (estimateDisplay) {
      estimateDisplay.textContent = `${calculated.toLocaleString('ru-RU')} ₽`;
    }
  }

  function renderStep(stepIndex) {
    steps.forEach((pane, idx) => {
      pane.style.display = (idx + 1 === stepIndex) ? 'block' : 'none';
    });

    if (stepIndicator) stepIndicator.textContent = `0${stepIndex} / 0${totalSteps}`;
    if (progressFill) progressFill.style.width = `${(stepIndex / totalSteps) * 100}%`;

    if (btnPrev) {
      btnPrev.style.visibility = (stepIndex === 1) ? 'hidden' : 'visible';
    }

    if (btnNext) {
      btnNext.style.display = (stepIndex === totalSteps) ? 'none' : 'inline-flex';
    }

    updatePricing();
  }

  quizForm.querySelectorAll('.quiz-card-option').forEach(card => {
    card.addEventListener('click', () => {
      const group = card.dataset.group;
      const val = card.dataset.value;
      const label = card.querySelector('.quiz-option-title')?.textContent || val;

      if (group === 'carClass') {
        quizForm.querySelectorAll('[data-group="carClass"]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        quizState.carClass = val;
        quizState.carClassName = label;
      } else if (group === 'condition') {
        quizForm.querySelectorAll('[data-group="condition"]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        quizState.condition = val;
        quizState.conditionName = label;
      } else if (group === 'package') {
        quizForm.querySelectorAll('[data-group="package"]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        quizState.package = val;
        quizState.packageName = label;
      } else if (group === 'option') {
        card.classList.toggle('selected');
        const isSel = card.classList.contains('selected');
        if (isSel) {
          if (!quizState.options.includes(val)) quizState.options.push(val);
          if (!quizState.optionsNames.includes(label)) quizState.optionsNames.push(label);
        } else {
          quizState.options = quizState.options.filter(o => o !== val);
          quizState.optionsNames = quizState.optionsNames.filter(o => o !== label);
        }
      }

      updatePricing();
    });
  });

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentStep < totalSteps) {
        currentStep++;
        renderStep(currentStep);
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        renderStep(currentStep);
      }
    });
  }

  // Отправка квиза
  quizForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('quiz-client-name');
    const phoneInput = document.getElementById('quiz-client-phone');
    const modelInput = document.getElementById('quiz-client-car');
    const submitBtn = quizForm.querySelector('button[type="submit"]');

    if (!nameInput.value.trim() || !phoneInput.value.trim()) {
      showToast('Пожалуйста, укажите имя и телефон', true);
      return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Фиксация в реестре...</span>';
    submitBtn.disabled = true;

    const deviceTime = getDeviceTimestamp();
    const payload = {
      source_type: 'quiz_calculator',
      client_name: nameInput.value.trim(),
      client_phone: phoneInput.value.trim(),
      client_time: deviceTime.client_time,
      client_tz: deviceTime.client_tz,
      car_model: modelInput.value.trim() || quizState.carClassName,
      car_condition: quizState.conditionName,
      service_package: quizState.packageName,
      selected_options: quizState.optionsNames,
      estimated_price: `${quizState.finalPrice.toLocaleString('ru-RU')} ₽`,
      discount_promo: 'Сертификат 15 000 ₽ + Антидождь в подарок',
      comments: `Класс: ${quizState.carClassName}. Состояние: ${quizState.conditionName}.`
    };

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (resData.success) {
        openSuccessModal({
          orderNumber: resData.orderNumber,
          car: payload.car_model,
          package: payload.service_package,
          price: payload.estimated_price,
          bonus: payload.discount_promo
        });
        quizForm.reset();
        currentStep = 1;
        renderStep(1);
      } else {
        showToast(resData.error || 'Ошибка при отправке', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Ошибка соединения при отправке заявки', true);
    } finally {
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  });

  renderStep(1);
}

/* ==========================================================================
   3. ИНТЕРАКТИВНЫЙ ВЫБОР ДАТЫ (ИСПРАВЛЕННЫЙ РУССКИЙ КАЛЕНДАРЬ)
   ========================================================================== */
function initDatePicker() {
  const dateContainer = document.getElementById('date-picker-pills');
  if (!dateContainer) return;

  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  // Все 12 месяцев русского языка для предотвращения undefined
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  
  const now = new Date();
  dateContainer.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);

    const dayName = (i === 0) ? 'Сегодня' : (i === 1) ? 'Завтра' : daysOfWeek[d.getDay()];
    const dayNum = d.getDate();
    const monthName = months[d.getMonth()] || 'октября';
    const fullDateStr = `${dayNum} ${monthName}`;

    const pill = document.createElement('div');
    pill.className = `date-pill ${i === 0 ? 'active' : ''}`;
    pill.dataset.date = fullDateStr;
    pill.innerHTML = `
      <span class="date-day-name">${dayName}</span>
      <span class="date-day-number">${dayNum}</span>
    `;

    pill.addEventListener('click', () => {
      dateContainer.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });

    dateContainer.appendChild(pill);
  }

  // Слоты времени
  const timeBtns = document.querySelectorAll('.time-slot-btn');
  timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/* ==========================================================================
   4. ФИНАЛЬНАЯ ФОРМА БРОНИРОВАНИЯ
   ========================================================================== */
function initBookingForms() {
  const bookingForm = document.getElementById('final-booking-form');
  if (!bookingForm) return;

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('book-name').value.trim();
    const phone = document.getElementById('book-phone').value.trim();
    const car = document.getElementById('book-car').value.trim() || 'Премиум автомобиль';
    const serviceSelect = document.getElementById('book-service').value;

    const activeDatePill = document.querySelector('.date-pill.active');
    const selectedDate = activeDatePill ? activeDatePill.dataset.date : 'Ближайшая дата';

    const activeTimeSlot = document.querySelector('.time-slot-btn.active');
    const selectedTime = activeTimeSlot ? activeTimeSlot.textContent.trim() : '10:00';

    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Бронирование бокса...</span>';
    submitBtn.disabled = true;

    const deviceTime = getDeviceTimestamp();
    const payload = {
      source_type: 'direct_booking',
      client_name: name,
      client_phone: phone,
      client_time: deviceTime.client_time,
      client_tz: deviceTime.client_tz,
      car_model: car,
      service_package: serviceSelect,
      visit_date: selectedDate,
      visit_time: selectedTime,
      discount_promo: 'Приоритетный въезд + тест гидрофобности',
      comments: `Клиент выбрал время визита: ${selectedDate} в ${selectedTime}`
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        openSuccessModal({
          orderNumber: data.orderNumber,
          car: payload.car_model,
          package: payload.service_package,
          date: `${selectedDate}, ${selectedTime}`,
          bonus: 'Приоритетный въезд'
        });
        bookingForm.reset();
      } else {
        showToast(data.error || 'Ошибка бронирования', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Сбой соединения при бронировании', true);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  window.selectTariffAndScroll = function(tariffName) {
    const serviceSelect = document.getElementById('book-service');
    if (serviceSelect) {
      serviceSelect.value = tariffName;
    }
    const targetSection = document.getElementById('booking-section');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
}

/* ==========================================================================
   5. АККОРДЕОН FAQ
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   6. МОДАЛЬНОЕ ОКНО И TOAST
   ========================================================================== */
function openSuccessModal(details) {
  const modal = document.getElementById('success-modal');
  if (!modal) return;

  const numEl = document.getElementById('modal-lead-number');
  const carEl = document.getElementById('modal-summary-car');
  const pkgEl = document.getElementById('modal-summary-package');
  const bonusEl = document.getElementById('modal-summary-bonus');

  if (numEl) numEl.textContent = details.orderNumber || 'OBS-1088';
  if (carEl) {
    const rawCar = details.car ? String(details.car).trim() : '';
    carEl.textContent = (rawCar.length > 1) ? rawCar : 'Премиум автомобиль клиента';
  }
  if (pkgEl) pkgEl.textContent = details.package || 'Total Armor Elite (Полный полиуретан 200 µm)';
  if (bonusEl) bonusEl.textContent = details.bonus || 'Сертификат 15 000 ₽ + Антидождь в подарок';

  modal.classList.add('active');
}

window.closeSuccessModal = function() {
  const modal = document.getElementById('success-modal');
  if (modal) modal.classList.remove('active');
};

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('success-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        window.closeSuccessModal();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeSuccessModal();
    }
  });
});

function showToast(message, isError = false) {
  let toast = document.querySelector('.toast-notice');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="toast-icon">${isError ? '✕' : '✓'}</div>
    <div class="toast-text">${message}</div>
  `;

  if (isError) {
    toast.style.borderColor = '#ef4444';
  } else {
    toast.style.borderColor = 'var(--accent-gold)';
  }

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

/* ==========================================================================
   7. ДИНАМИЧЕСКИЙ GLOW НА КАРТОЧКАХ
   ========================================================================== */
function initGlowCards() {
  const cards = document.querySelectorAll('.price-card, .case-card, .quiz-card-option');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

/* ==========================================================================
   8. МОБИЛЬНОЕ МЕНЮ И НАВИГАЦИЯ
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('mobile-drawer-close');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !drawer) return;

  function openMenu() {
    drawer.classList.add('open');
    toggleBtn.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    drawer.classList.remove('open');
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', () => {
    if (drawer.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMenu);
  }

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Закрытие по клику вне контента
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeMenu();
    }
  });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
});

