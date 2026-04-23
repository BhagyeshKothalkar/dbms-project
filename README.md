# IIT Indore Student Hub

This repository contains the IIT Indore Student Hub project, which consists of a Python FastAPI backend and a Vite React frontend.

## Project Structure
- `backend/` - Contains the Python FastAPI server and PostgreSQL database configurations.
- `iit-indore-student-hub/` - Contains the Vite React frontend application.

## Prerequisites
- **Python 3.8+**
- **Node.js** (v18+) and **npm** or **bun**
- **PostgreSQL** (Make sure your local PostgreSQL database is running and configured according to `backend/database.py`)

---

## 1. Running the Backend (FastAPI)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment (assuming you are on Mac/Linux):
   ```bash
   source venv/bin/activate
   ```
3. Install the dependencies (the `requirements.txt` file is already included):
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn main:app --reload
   ```
The backend server will typically start at `http://localhost:8000`.

---

## 2. Running the Frontend (React + Vite)

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd iit-indore-student-hub
   ```
2. Install the dependencies. You can use npm or bun:
   ```bash
   npm install
   # OR
   bun install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   # OR
   bun run dev
   ```

The terminal will output a local development URL (usually `http://localhost:5173`). Open this URL in your browser to view the application.
