@echo off
title JanjiCare - Development
echo ========================================================
echo   JanjiCare - menjalankan 3 layanan (masing-masing jendela)
echo ========================================================
echo   Queue Service : http://localhost:3002
echo   Backend API   : http://localhost:3000
echo   Frontend      : http://localhost:5173
echo.
echo   Tutup jendela layanan untuk menghentikannya.
echo   Jalankan file ini SATU KALI saja (hindari port bentrok).
echo ========================================================

where node.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js tidak ditemukan. Instal Node.js 20+ terlebih dahulu.
    pause
    exit /b 1
)

start "JanjiCare Queue Service" cmd /k "cd /d %~dp0services\queue-service && npm run dev"
start "JanjiCare Backend API" cmd /k "cd /d %~dp0backend && npm run dev"
start "JanjiCare Frontend" cmd /k "cd /d %~dp0janjicare-frontend && npm run dev"

timeout /t 6 >nul
start http://localhost:5173
