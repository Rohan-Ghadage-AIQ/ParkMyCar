@echo off
echo ========================================================
echo Starting ParkMumbai Prototype (FastAPI + React Vite)
echo ========================================================

start "ParkMumbai Backend" cmd /k "cd backend && uvicorn app.main:app --reload --port 8000"
start "ParkMumbai Frontend" cmd /k "cd frontend && npm run dev"

echo Backend started at: http://localhost:8000 (OpenAPI: http://localhost:8000/docs)
echo Frontend started at: http://localhost:5173
echo.
echo Press any key to exit this launcher...
pause > nul
