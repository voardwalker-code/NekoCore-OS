@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js was not found on this computer.
  choice /M "Install Node.js LTS now using winget"
  if errorlevel 2 goto :NO_AUTO_INSTALL

  where winget >nul 2>&1
  if errorlevel 1 (
    echo winget was not found on this system.
    echo Install Node.js 18+ from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
  )

  echo.
  echo Running: winget install --id OpenJS.NodeJS.LTS -e --source winget
  winget install --id OpenJS.NodeJS.LTS -e --source winget

  rem Include common Node.js install path in case PATH has not refreshed yet.
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%PATH%;%ProgramFiles%\nodejs"

  where node >nul 2>&1
  if errorlevel 1 (
    echo.
    echo Node.js still is not available in this terminal session.
    echo Close this window and run Start-NekoCore-Server.bat again.
    echo.
    pause
    exit /b 1
  )

  goto :NODE_READY
)

:NODE_READY
goto :START_SERVER

:NO_AUTO_INSTALL
echo Install Node.js 18+ from https://nodejs.org/ and try again.
  echo.
  pause
  exit /b 1
)

:START_SERVER
echo.
echo Starting NekoCore OS server...
echo If this window closes, check README setup steps.
echo.

node booter.js
set EXIT_CODE=%ERRORLEVEL%

echo.
if not "%EXIT_CODE%"=="0" (
  echo Server exited with code %EXIT_CODE%.
  echo Press any key to close this window.
  pause >nul
)

exit /b %EXIT_CODE%
