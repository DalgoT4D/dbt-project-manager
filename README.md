# DBT Project Manager

A monorepo application to manage your local dbt project's sources, models, and tests via an intuitive UI.

## Project Structure

```
.
├── backend/           # FastAPI backend
│   ├── app/          # Application code
│   ├── tests/        # Backend tests
│   └── requirements.txt
└── frontend/         # React frontend
    ├── src/          # Source code
    └── package.json
```

## Prerequisites

- Python 3.8+
- Node.js 18+
- npm or yarn

## Setup and Running

### Backend

1. Create and activate a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the FastAPI server:
```bash
fastapi run --reload app/main.py --port 10000
```

The backend will be available at http://localhost:10000

### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:5173/

## Development

- Backend API documentation is available at http://localhost:10000/docs
- Frontend uses Vite for fast development and hot module replacement
- The project uses Material-UI for the frontend components

## License

This project is licensed under the MIT License - see the LICENSE file for details.
