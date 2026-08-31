@echo off
title RailOpt AI - Passenger App Launcher
color 0D
echo ====================================================================
echo 📱 RAILOPT AI - PASSENGER APP (User POV: Jayashree)
echo ====================================================================
echo.
echo Opening Passenger App: http://localhost:3001
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:3001"

node server.js
pause
