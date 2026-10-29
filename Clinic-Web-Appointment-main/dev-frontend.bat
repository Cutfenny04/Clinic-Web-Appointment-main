@echo off
title JanjiCare Frontend Development Server
echo ========================================================
echo   Starting JanjiCare React Standalone Frontend...
echo ========================================================

:: Pastikan path Node.js terdeteksi di Windows
set "PATH=C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%PATH%"

where node.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js tidak ditemukan! Pastikan Node.js sudah terinstal.
    pause
    exit /b 1
)

cd /d "%~dp0janjicare-frontend"

echo Menjalankan Vite Dev Server...
echo Buka browser di: http://localhost:5173
echo.

call npm.cmd run dev

pause
