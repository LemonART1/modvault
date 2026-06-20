# ModVault

Каталог модов для популярных PC-игр (BeamNG.drive, Assetto Corsa, Subnautica 2,
Stardew Valley, GTA V, ETS2, Cyberpunk 2077, Baldur's Gate 3).

- **Live:** https://modvault.space
- **Стек:** статический HTML/CSS/JS, бэкенд на Supabase (логин, рейтинги, статистика)
- **Хостинг:** Netlify (автодеплой из ветки `main`)

## Как добавить или отредактировать моды (локально)

```powershell
.\START_LOCAL_ADMIN.bat
```

Откроется локальная админка `http://localhost:8787/local-admin.html`. Она пишет
файлы прямо в проект: сохраняет картинки, обновляет `js/data/mods.js` и
регенерирует страницы модов в `mods/<game>/`.

Подробности по контенту — в [CONTENT_GUIDE.md](CONTENT_GUIDE.md).

## Как опубликовать изменения на сайт

Live-сайт берёт файлы из GitHub. После правок их нужно отправить:

```powershell
git add -A
git commit -m "описание изменений"
git push
```

Через ~1 минуту Netlify сам обновит https://modvault.space

## Полезные команды

```powershell
node tools/generate-mod-pages.js          # перегенерировать страницы модов
node tools/generate-editorial-content.js  # перегенерировать новости и гайды
node tools/generate-seo-assets.js         # обновить SEO, sitemap, favicon
node tools/check-links.js                 # проверить битые ссылки
```
