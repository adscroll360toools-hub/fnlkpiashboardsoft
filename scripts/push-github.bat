@echo off
REM From repo root: scripts\push-github.bat "optional commit message"
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push-github.ps1" %*
