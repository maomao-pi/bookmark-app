@echo off
echo ========================================
echo   知链方舟 Bookmark App 一键启动
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 启动后端服务 (端口 8080)...
start "Backend" cmd /k "cd /d %~dp0server && mvn spring-boot:run"

echo [2/3] 启动前端用户端 (端口 5173)...
start "Frontend" cmd /k "npm run dev"

echo [3/3] 启动管理后台 (端口 5174)...
start "Admin" cmd /k "npm run dev:admin"

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo   用户端:   http://localhost:5173
echo   管理后台: http://localhost:5174
echo   后端API:  http://localhost:8080
echo ========================================
echo.
echo 按任意键打开用户端...
pause > nul
start http://localhost:5173
