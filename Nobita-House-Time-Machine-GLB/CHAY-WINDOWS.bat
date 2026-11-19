@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Can cai dat Node.js 22 hoac moi hon truoc khi chay.
 pause
 exit /b 1
)
call npm install
if errorlevel 1 (
 echo npm install that bai. Kiem tra ket noi Internet va Node.js.
 pause
 exit /b 1
)
call npm run dev -- --host 127.0.0.1 --port 5173
pause
