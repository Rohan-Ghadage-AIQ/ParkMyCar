.PHONY: help dev backend frontend test import

help:
	@echo "ParkMumbai Commands:"
	@echo "  make dev       - Run both backend and frontend"
	@echo "  make backend   - Run FastAPI backend on port 8000"
	@echo "  make frontend  - Run Vite frontend on port 5173"
	@echo "  make test      - Run pytest backend test suite"
	@echo "  make import    - Run MCGM Open Data Importer"

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test:
	cd backend && pytest -v

import:
	cd backend && python -m app.importers.mcgm_import --dir ../data
