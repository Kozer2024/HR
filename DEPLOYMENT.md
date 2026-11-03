# Публикация HR BMSTU на VPS и хранение файлов в Google Drive

Проект подготовлен для Linux VPS с Docker Compose, PostgreSQL, Caddy и HTTPS. Для нагрузки примерно до 30 пользователей выбран VPS Mini: 2 vCPU, 2 ГБ RAM, 100 ГБ SSD. Фото и отчёты можно хранить в закрытой папке на личном Google Drive. Сервер получает к ним доступ через OAuth; ссылки приложения остаются прежними, сами файлы не становятся общедоступными.

## Что понадобится

- Аккаунт у VPS-провайдера и доступ по SSH.
- Домен или бесплатный поддомен, DNS которого можно направить на IPv4 сервера. Для HTTPS домен обязателен.
- Аккаунт Google, Google Cloud project и OAuth credentials для Drive API.
- Секреты приложения и пароль администратора.

Тариф VPS Mini на момент подготовки этой инструкции указан за 479 ₽/месяц; домен, если выбрать платный, оплачивается отдельно. Резервные копии у провайдера в тариф не входят. Для минимальной цены подойдёт бесплатный DNS-поддомен, направленный на адрес сервера.

## 1. Закажите и подготовьте сервер

1. Закажите VPS с Ubuntu 24.04 LTS и IPv4. Для этой конфигурации выбирайте не меньше 2 ГБ RAM.
2. В панели провайдера задайте SSH-ключ, если доступен такой вариант. Иначе сохраните выданный пароль root в менеджере паролей.
3. Создайте DNS-запись типа `A` для своего домена/поддомена со значением IPv4 VPS. Дождитесь обновления DNS.
4. Подключитесь из PowerShell: `ssh root@АДРЕС_СЕРВЕРА`.
5. Установите Docker Engine и Compose plugin по официальной инструкции Docker для Ubuntu: <https://docs.docker.com/engine/install/ubuntu/>. Проверьте команды `docker --version` и `docker compose version`.
6. Откройте в сетевом экране провайдера входящие TCP-порты 22, 80 и 443. Не открывайте PostgreSQL-порт 5432 в интернет.

Для сборки Next.js на VPS с 2 ГБ RAM добавьте 2 ГБ swap, чтобы сборка реже завершалась из-за нехватки памяти:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 2. Скопируйте проект на VPS

Если репозиторий GitHub публичный, на сервере выполните:

```bash
apt update && apt install -y git
git clone https://github.com/Kozer2024/HR.git /opt/hr
cd /opt/hr
```

Если изменения из этой подготовки ещё не появились на GitHub, сначала отправьте их (`git add -A`, `git commit`, `git push`), затем клонируйте репозиторий. Не добавляйте в Git файл `.env.production`.

## 3. Создайте production-настройки

```bash
cd /opt/hr
cp .env.production.example .env.production
nano .env.production
```

Заполните `DOMAIN`, `DB_PASSWORD`, `AUTH_SECRET`, `ADMIN_EMAIL` и `ADMIN_PASSWORD`.

- `DOMAIN` — точное доменное имя без `https://`.
- Создайте `DB_PASSWORD` случайной шестнадцатеричной строкой: `openssl rand -hex 24`.
- Создайте `AUTH_SECRET`: `openssl rand -base64 48`.
- Пароль администратора сделайте уникальным и длиной не менее 12 символов.
- Не используйте пробелы и символы `#` в значениях паролей `.env.production`.

Сохраните файл и ограничьте доступ: `chmod 600 .env.production`.

## 4. Подключите Google Drive (можно выполнить и после запуска сайта)

Используется Google Drive API и ограниченная область `drive.file`: сайт работает с файлами, которые создаёт сам. Он автоматически создаст папку `HR BMSTU photos and reports` в вашем Диске при первой загрузке. Приложение скачивает файлы через API сайта с действующими проверками доступа; общие публичные ссылки Google Drive не создаются.

1. Откройте <https://console.cloud.google.com/> под владельцем Google Drive и создайте проект.
2. Включите **Google Drive API** в разделе APIs & Services → Library.
3. Настройте OAuth consent screen / Google Auth Platform как **External**. Добавьте scope `https://www.googleapis.com/auth/drive.file` и свой Google аккаунт как тестового пользователя на время настройки.
4. Переведите OAuth-приложение в статус **In production** до получения рабочего refresh token. В статусе Testing Google ограничивает срок refresh token для Drive семью днями. При публикации могут отображаться предупреждение о непроверенном приложении и запрос подтверждения Google — это ожидаемо для собственного OAuth-проекта.
5. Создайте OAuth Client ID типа **Web application**. В Authorized redirect URIs добавьте точно `https://developers.google.com/oauthplayground`.
6. Откройте <https://developers.google.com/oauthplayground/>. В настройках (значок шестерёнки) включите **Use your own OAuth credentials**, вставьте Client ID и Client Secret. В левом списке выберите Google Drive API v3 и введите scope `https://www.googleapis.com/auth/drive.file`.
7. Нажмите **Authorize APIs**, выберите свой аккаунт и подтвердите доступ. Затем нажмите **Exchange authorization code for tokens**. Скопируйте **Refresh token**.
8. В `.env.production` заполните `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `GDRIVE_REFRESH_TOKEN`. Секрет и refresh token никому не отправляйте и не вставляйте в GitHub.

Официальные инструкции Google: [включение загрузки файлов через Drive API](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [OAuth для серверных приложений и обновление токенов](https://developers.google.com/identity/protocols/oauth2/web-server), [OAuth Playground](https://developers.google.com/oauthplayground/).

Если Drive credentials оставить пустыми, новые файлы останутся на постоянном диске VPS в Docker volume `uploads_data`. Если заполнить только часть значений, загрузка завершится ошибкой, а не переключится молча на другое хранилище.

## 5. Запустите сайт

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs -f app
```

Первый запуск собирает контейнер (на VPS с 2 ГБ RAM сборка может занять несколько минут), ждёт PostgreSQL, применяет миграции Prisma, затем запускает сайт. Caddy автоматически получает TLS-сертификат, когда домен уже указывает на VPS и порты 80/443 доступны. Остановить просмотр логов: Ctrl+C — контейнеры продолжат работать.

Создайте начального администратора отдельной командой:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec app npx tsx prisma/seed-admin.ts
```

Откройте `https://ваш-домен`, войдите под `ADMIN_EMAIL` и `ADMIN_PASSWORD`, смените пароль после первого входа. Production seed создаёт только администратора и не добавляет демонстрационные площадки.

## 6. Перенесите текущую базу и фотографии (если нужны существующие данные)

Публикация кода не переносит локальные записи БД или `storage`. Сначала сделайте отдельные резервные копии локальной PostgreSQL и папки `storage`. Затем перенесите дамп в production PostgreSQL, а содержимое `storage` — в Docker volume. Не удаляйте локальные исходники, пока не проверили сайт и фото.

После переноса базы и папки с файлами, запуска сайта и настройки Google Drive выполните одноразовую миграцию старых локальных фото и отчётов:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec app npx tsx scripts/migrate-uploads-to-drive.ts
```

Скрипт загружает прежние файлы в Drive и обновляет ссылки в БД. Локальные копии на VPS остаются на месте. Без переноса исходной базы этот шаг не нужен.

## 7. Обновление и повседневное обслуживание

Обновить код после push в GitHub:

```bash
cd /opt/hr
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Проверить логи: `docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 app`.

База и файлы на VPS — отдельные данные. Делайте ежедневный `pg_dump` и отдельную копию Docker volume базы вне этого сервера. Google Drive хранит фото/отчёты, но не резервирует PostgreSQL и конфигурацию сервера. У провайдера резервные копии платные/опциональные; это может вывести ежемесячную сумму за пределы 500 ₽. Проверьте, что резервные копии реально восстанавливаются.

## Безопасность

- Файл `.env.production` хранится только на сервере, права доступа — `600`; не публикуйте его и не присылайте секреты сообщением.
- Не открывайте наружу порт PostgreSQL.
- В Google OAuth выдавайте только `drive.file`, не полный доступ `drive`.
- Смена OAuth Client Secret или отзыв Google-доступа остановит чтение/запись Drive до обновления настроек.
- При отключённом Google Drive новые файлы хранятся в локальном Docker volume; этот volume также нужно резервировать.
