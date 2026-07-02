@echo off
rem ============================================================
rem  VitaLunaris local build launcher (Windows).
rem  Mirrors scripts\dev.cmd: this project needs Node >= 22.15
rem  (Astro/Vite use module.registerHooks) and better-sqlite3 is
rem  compiled for Node 24. The plain `npm run build` calls
rem  `astro build` with whatever Node the shell defaults to, which
rem  on this machine is the pinned 22.14 and fails to load the
rem  Astro config. This launcher forces Herd's Node 24 like dev.
rem
rem  Render deploys with `npm run build` on Linux (Node from
rem  .nvmrc), so that script is left untouched — use this one
rem  (`npm run build:local`) for local Windows builds only.
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
echo [build] Using Node %NODE_MAJOR% from "%NODE_DIR%"

node "%~dp0..\node_modules\astro\bin\astro.mjs" build %*
endlocal
