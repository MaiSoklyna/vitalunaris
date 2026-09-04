@echo off
rem ============================================================
rem  VitaLunaris local dev launcher.
rem  This project requires Node >= 22.15 (Astro/Vite need
rem  module.registerHooks) and better-sqlite3 is compiled for
rem  Node 24. If a Node 24 from Laravel Herd's nvm is present we
rem  use it explicitly, so `npm run dev` works regardless of
rem  which Node version the shell defaults to.
rem ============================================================
setlocal

rem Prefer the newest Herd nvm Node >= 24 if one exists.
set "NODE_DIR="
if exist "%USERPROFILE%\.config\herd\bin\nvm" (
  for /f "delims=" %%v in ('dir /b /ad /o-n "%USERPROFILE%\.config\herd\bin\nvm\v24*" 2^>nul') do (
    if not defined NODE_DIR set "NODE_DIR=%USERPROFILE%\.config\herd\bin\nvm\%%v"
  )
)
if defined NODE_DIR set "PATH=%NODE_DIR%;%PATH%"

for /f "tokens=1 delims=." %%m in ('node -v') do set "NODE_MAJOR=%%m"
echo [dev] Using Node %NODE_MAJOR% from "%NODE_DIR%"

node "%~dp0..\node_modules\astro\bin\astro.mjs" dev %*
endlocal
