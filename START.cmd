@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12+ first: https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call npm.cmd ci
  if errorlevel 1 (
    echo Dependency installation failed. Check the message above.
    pause
    exit /b 1
  )
)
call npm.cmd run dev -- --open --port 5173 --strictPort
if errorlevel 1 pause
