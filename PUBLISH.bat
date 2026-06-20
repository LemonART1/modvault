@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo    ModVault — публикация изменений на сайт
echo ============================================
echo.

echo [1/4] Регенерация страниц модов...
call node tools/generate-mod-pages.js
echo.

echo [2/4] Обновление sitemap и SEO...
call node tools/generate-seo-assets.js
echo.

echo [3/4] Сохранение изменений...
git add -A
git commit -m "Update site (%date% %time%)"
echo.

echo [4/4] Отправка на сайт...
git push
echo.

echo ============================================
echo  Готово! Сайт https://modvault.space
echo  обновится примерно через минуту.
echo ============================================
echo.
pause
