# NestJS CMS API

REST API для системы управления контентом, построенная на NestJS с использованием PostgreSQL, Redis и JWT аутентификации.

## Технологии

- **Framework:** NestJS (latest)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Caching:** Redis
- **Auth:** Passport, JWT
- **Validation:** class-validator, class-transformer
- **Docs:** Swagger (OpenAPI)

## Возможности

- ✅ Аутентификация и авторизация (JWT + Refresh Token)
- ✅ CRUD операции для статей
- ✅ Пагинация, фильтрация и сортировка
- ✅ Redis кэширование
- ✅ Swagger документация
- ✅ Валидация данных
- ✅ Проверка прав доступа (ownership)

## Установка и запуск

### Предварительные требования

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker и Docker Compose (опционально)

### Локальная установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd mvp
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Настройте переменные окружения в `.env`:
```env
NODE_ENV=development
PORT=3003

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=mvp
DB_PASSWORD=mvp
DB_NAME=mvp_db

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_ACCESS_SECRET=your-access-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

5. Запустите PostgreSQL и Redis (через Docker):
```bash
docker-compose up -d postgres redis
```

6. Запустите миграции:
```bash
npm run migration:run
```

7. Запустите приложение:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Docker Compose

Для запуска всего стека через Docker:

```bash
docker-compose up -d
```

Приложение будет доступно по адресу: `http://localhost:3003`

## Миграции

### Создание миграции
```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

### Запуск миграций
```bash
npm run migration:run
```

### Откат миграции
```bash
npm run migration:revert
```

## API Документация

После запуска приложения, Swagger документация доступна по адресу:
- http://localhost:3003/api

## Endpoints

### Аутентификация

- `POST /auth/register` - Регистрация нового пользователя
- `POST /auth/login` - Вход в систему
- `POST /auth/refresh` - Обновление access token
- `POST /auth/logout` - Выход из системы

### Пользователи

- `GET /users` - Список пользователей (только ADMIN)
- `GET /users/:id` - Получение пользователя по ID
- `PATCH /users/:id` - Обновление пользователя
- `DELETE /users/:id` - Удаление пользователя (только ADMIN)

### Статьи

- `POST /articles` - Создание статьи (требуется авторизация)
- `GET /articles` - Список статей с пагинацией и фильтрацией
- `GET /articles/:id` - Получение статьи по ID
- `PATCH /articles/:id` - Обновление статьи (требуется авторизация, проверка ownership)
- `DELETE /articles/:id` - Удаление статьи (требуется авторизация, проверка ownership)

## Примеры запросов

### Регистрация
```bash
curl -X POST http://localhost:3003/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Вход
```bash
curl -X POST http://localhost:3003/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Создание статьи
```bash
curl -X POST http://localhost:3003/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "My First Article",
    "description": "Short description",
    "content": "Full article content here..."
  }'
```

### Получение статей с фильтрацией
```bash
curl "http://localhost:3003/articles?page=1&limit=10&authorId=USER_UUID&sortOrder=DESC"
```

## Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Coverage
npm run test:cov
```

## Структура проекта

```
src/
├── auth/              # Модуль аутентификации
├── users/             # Модуль пользователей
├── articles/          # Модуль статей
├── common/            # Общие компоненты
├── config/            # Конфигурация
└── database/          # Миграции
```

## Ближайшие задачи
- CI/CD: настроить GitHub Actions для lint/test/build и миграций.
- Контроль качества: добавить husky + lint-staged, единый форматтер (prettier).
- Тестирование: расширить e2e для auth/articles, подготовить фикстуры/сидирование.
- Безопасность: rate limiting, helmet, ротация refresh токенов, аудит входов.
- Наблюдаемость: структурированные логи, /health и /ready, метрики (Prometheus).
- Данные: автоматизировать миграции в CI, сиды базовых ролей и админа.
- Документация: обновить Swagger схемы/примеры, чек-лист переменных .env.
- Инфраструктура: docker-compose профиль prod (app+db+redis), удобные dev-скрипты.

## Лицензия

MIT

