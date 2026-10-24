// server.js - Сервер детейлинг-ателье OBSIDIAN ATELIER
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Парсинг JSON и URL-encoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Установка UTF-8 заголовков для API
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Раздача статических файлов из public
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных SQLite
const dbPath = path.join(__dirname, 'obsidian_leads.db');
const db = new DatabaseSync(dbPath);

// Создание таблицы лидов
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    source_type TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    car_model TEXT,
    car_condition TEXT,
    service_package TEXT,
    selected_options TEXT,
    estimated_price TEXT,
    discount_promo TEXT,
    visit_date TEXT,
    visit_time TEXT,
    comments TEXT,
    status TEXT DEFAULT 'new'
  )
`);

// Проверяем наличие записей
const countStmt = db.prepare('SELECT COUNT(*) as count FROM leads');
let countRow = countStmt.get();

if (countRow.count === 0) {
  const insertDemo = db.prepare(`
    INSERT INTO leads (
      source_type, client_name, client_phone, car_model, car_condition,
      service_package, selected_options, estimated_price, discount_promo,
      visit_date, visit_time, comments, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDemo.run(
    'quiz_calculator',
    'Константин',
    '+7 (985) 920-14-88',
    'Porsche 911 GT3 (992)',
    'Новый из салона (0 км)',
    'Total Armor Elite (Полный глянец 200 µm)',
    '["Бронь оптики", "Защита лобового ClearPlex", "Керамика кожи салона"]',
    '385 000 ₽',
    'Сертификат 15 000 ₽ + Антидождь в подарок',
    '24 октября 2026',
    '11:00',
    'Автомобиль забираем из Порше Центр Москва, необходим закрытый эвакуатор ателье',
    'in_progress'
  );

  insertDemo.run(
    'quick_booking',
    'Алексей Викторович',
    '+7 (916) 430-77-00',
    'Li Auto L9 Ultra',
    'Пробег 3 500 км',
    'Satin Matte Transformation (Матовый сатин)',
    '["Антихром Shadow Line", "Бронь экранов салона"]',
    '320 000 ₽',
    'Клубный бонус 10%',
    '25 октября 2026',
    '14:30',
    'Интересует оклейка с глубоким подворотом без демонтажа блоков радаров',
    'new'
  );

  insertDemo.run(
    'quiz_calculator',
    'Михаил',
    '+7 (903) 777-12-34',
    'BMW M8 Competition',
    'Небольшая паутинка на капоте',
    'Risk Zones Pro + Восстановительная полировка',
    '["Керамика 9H 4 слоя", "Гидрофоб дисков"]',
    '195 000 ₽',
    'Сертификат 15 000 ₽',
    '26 октября 2026',
    '10:00',
    'Ранее делал у вас керамику на Cayenne, хочу аналогичное качество',
    'confirmed'
  );
}

// API: Сохранение новой заявки
app.post('/api/leads', (req, res) => {
  try {
    const {
      source_type = 'quick_form',
      client_name,
      client_phone,
      car_model = 'Премиум автомобиль',
      car_condition = 'Не указано',
      service_package = 'Индивидуальный расчет',
      selected_options = [],
      estimated_price = 'По согласованию',
      discount_promo = 'Сертификат 15 000 ₽',
      visit_date = '',
      visit_time = '',
      comments = ''
    } = req.body;

    if (!client_name || !client_phone) {
      return res.status(400).json({
        success: false,
        error: 'Пожалуйста, укажите имя и контактный телефон'
      });
    }

    const optionsStr = typeof selected_options === 'string'
      ? selected_options
      : JSON.stringify(selected_options);

    const insertStmt = db.prepare(`
      INSERT INTO leads (
        source_type, client_name, client_phone, car_model, car_condition,
        service_package, selected_options, estimated_price, discount_promo,
        visit_date, visit_time, comments, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `);

    const result = insertStmt.run(
      source_type,
      String(client_name).trim(),
      String(client_phone).trim(),
      String(car_model).trim(),
      String(car_condition).trim(),
      String(service_package).trim(),
      optionsStr,
      String(estimated_price).trim(),
      String(discount_promo).trim(),
      String(visit_date).trim(),
      String(visit_time).trim(),
      String(comments).trim()
    );

    const leadId = result.lastInsertRowid;
    const orderNumber = `OBS-${String(leadId).padStart(4, '0')}`;

    return res.status(201).json({
      success: true,
      leadId: leadId,
      orderNumber: orderNumber,
      message: 'Заявка успешно зафиксирована в реестре OBSIDIAN ATELIER'
    });
  } catch (err) {
    console.error('Ошибка сохранения заявки:', err);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера при сохранении заявки'
    });
  }
});

// Авторизация администратора (Логин: 1, Пароль: 1)
const ADMIN_USER = '1';
const ADMIN_PASS = '1';
const ADMIN_SESSION_SECRET = 'obsidian_session_token_authenticated_2026';

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const key = parts.shift().trim();
      const val = parts.join('=').trim();
      if (key) list[key] = decodeURIComponent(val);
    });
  }
  return list;
}

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  return cookies['obsidian_admin_session'] === ADMIN_SESSION_SECRET;
}

function requireAdminAuth(req, res, next) {
  if (isAdminAuthenticated(req)) {
    return next();
  }
  return res.status(401).json({
    success: false,
    error: 'Доступ ограничен. Требуется авторизация администратора.'
  });
}

// API: Вход администратора
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (String(username || '').trim() === ADMIN_USER && String(password || '').trim() === ADMIN_PASS) {
    res.setHeader('Set-Cookie', `obsidian_admin_session=${ADMIN_SESSION_SECRET}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return res.json({ success: true, message: 'Авторизация успешна' });
  }
  return res.status(401).json({
    success: false,
    error: 'Неверный логин или пароль'
  });
});

// API: Выход администратора
app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', `obsidian_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res.json({ success: true, message: 'Сеанс завершен' });
});

// API: Получение всех заявок (Защищено авторизацией)
app.get('/api/leads', requireAdminAuth, (req, res) => {
  try {
    const selectStmt = db.prepare('SELECT * FROM leads ORDER BY id DESC');
    const leads = selectStmt.all();
    return res.json({ success: true, data: leads, count: leads.length });
  } catch (err) {
    console.error('Ошибка получения заявок:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Количество заявок для бейджа (Защищено авторизацией)
app.get('/api/leads/count', requireAdminAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM leads');
    const result = stmt.get();
    return res.json({ success: true, count: result.count });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Обновление статуса заявки (Защищено авторизацией)
app.patch('/api/leads/:id', requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    const allowed = ['new', 'in_progress', 'confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Недопустимый статус' });
    }

    const updateStmt = db.prepare('UPDATE leads SET status = ? WHERE id = ?');
    updateStmt.run(status, id);

    return res.json({ success: true, message: 'Статус успешно обновлен' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Удаление заявки (Защищено авторизацией)
app.delete('/api/leads/:id', requireAdminAuth, (req, res) => {
  try {
    const id = req.params.id;
    const deleteStmt = db.prepare('DELETE FROM leads WHERE id = ?');
    deleteStmt.run(id);
    return res.json({ success: true, message: 'Заявка удалена' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Роут /admin - единая закрытая точка входа в CRM
app.get('/admin', (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (isAdminAuthenticated(req)) {
      const filePath = path.join(__dirname, 'views', 'admin.html');
      const htmlContent = fs.readFileSync(filePath, 'utf-8');
      return res.send(htmlContent);
    } else {
      const filePath = path.join(__dirname, 'views', 'login.html');
      const htmlContent = fs.readFileSync(filePath, 'utf-8');
      return res.send(htmlContent);
    }
  } catch (err) {
    console.error('Ошибка отдачи /admin:', err);
    res.status(500).send('Ошибка загрузки панели управления: ' + err.message);
  }
});

// Старый роут /leads редиректим на скрытый /admin
app.get('/leads', (req, res) => {
  return res.redirect(302, '/admin');
});

// Главный роут
app.get('/', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'index.html');
    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  } catch (err) {
    console.error('Ошибка отдачи index.html:', err);
    res.status(500).send('Ошибка загрузки главной страницы: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 OBSIDIAN ATELIER Detailing Studio Server`);
  console.log(`📡 Главная страница:  http://localhost:${PORT}`);
  console.log(`🔒 Панель управления: http://localhost:${PORT}/admin`);
  console.log(`🔑 Авторизация:       Логин: 1 | Пароль: 1`);
  console.log(`💾 Локальная БД:      ${dbPath} (SQLite)`);
  console.log(`==================================================\n`);
});
