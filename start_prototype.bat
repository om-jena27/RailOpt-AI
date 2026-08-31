@echo off
title RailOpt AI - SIH Prototype Launcher
color 0A
echo ====================================================================
echo  RAILOPT AI - AI-POWERED AUTOMATIC BLOCK PLANNING SYSTEM
echo    SIH26027 Prototype Launcher
echo ====================================================================
echo.

:: Install dependencies if node_modules is missing
if not exist "node_modules" (
    echo [SETUP] node_modules not found. Running npm install...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Make sure Node.js is installed.
        pause
        exit /b 1
    )
    echo [SETUP] Dependencies installed successfully.
    echo.
)

echo [1/2] Authority Dashboard:  http://localhost:3000
echo [2/2] Passenger App (User): http://localhost:3001
echo.
echo Starting Express server... (browser will open automatically)
echo Press Ctrl+C to stop.
echo.

:: Open browser after a 3-second delay (gives server time to start)
start /b cmd /c "timeout /t 3 /nobreak >nul && start "" "http://localhost:3000" && start "" "http://localhost:3001""

node server.js
pause
