@echo off
echo ========================================
echo   知链方舟 Bookmark App 停止服务
echo ========================================
echo.

echo 正在停止前端服务...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo 正在停止后端服务...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo ========================================
echo   所有服务已停止！
echo ========================================
pause
