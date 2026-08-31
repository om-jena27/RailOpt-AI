@echo off
title RailOpt AI - Authority Dashboard Launcher
color 0B
echo ====================================================================
echo 🚆 RAILOPT AI - AUTHORITY DASHBOARD (Kharagpur SER Division)
echo ====================================================================
echo.
echo Opening Authority Dashboard: http://localhost:3000
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

node server.js
pause
