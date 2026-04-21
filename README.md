# SmartSquare — Personal Finance Management System

A full-stack personal finance OS built with Node.js, Express, and MongoDB Atlas.

## Features
- **Smart Square Index™** — proprietary 0–1000 financial health score
- **Dashboard** — real-time net worth, cash flow charts, spending breakdown
- **Transactions** — full CRUD with category tracking and search/filter
- **Budget Tracker** — set monthly limits per category, track progress
- **Goals** — savings goals with progress tracking and contributions
- **Accounts** — link savings, credit, investment accounts
- **AI Insights** — rule-based financial recommendations
- **JWT Auth** — secure register/login with token-based sessions

## Project Structure
```
smartsquare/
├── backend/
│   ├── config/
│   │   └── database.js        # MongoDB Atlas connection
│   ├── middleware/
│   │   └── auth.js            # JWT protect + generateToken
│   ├── models/
│   │   ├── User.js            # User + Smart Index schema
│   │   ├── Transaction.js     # Transaction + analytics queries
│   │   └── Finance.js         # Account, Budget, Goal models
│   ├── routes/
│   │   ├── auth.js            # /api/auth/*
│   │   ├── transactions.js    # /api/transactions/*
│   │   ├── finance.js         # /api/finance/accounts|budgets|goals
│   │   └── index.js           # /api/index/dashboard|calculate|insights
│   ├── server.js              # Express entry point
│   ├── .env.example           # Environment variables template
│   └── package.json
└── frontend/
    └── index.html             # Full SPA (Auth + Dashboard)
```

## Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — MongoDB URI is already pre-filled:
# MONGODB_URI=mongodb://atlas-sql-69e6ddc33bbe05eaa1c55865-tnsdcr.a.query.mongodb.net/sample_mflix?ssl=true&authSource=admin
```

### 3. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 4. Open the app
Visit http://localhost:5000 in your browser.

Register a new account, then start adding transactions, budgets, and goals.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update profile |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions | List with filters/pagination |
| POST | /api/transactions | Add transaction |
| PUT | /api/transactions/:id | Update transaction |
| DELETE | /api/transactions/:id | Delete transaction |
| GET | /api/transactions/summary/monthly | Monthly summary |
| GET | /api/transactions/cashflow | 6-month cashflow |
| GET | /api/transactions/stats | This vs last month |

### Finance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/finance/accounts | List/create accounts |
| PUT | /api/finance/accounts/:id | Update account |
| GET/POST | /api/finance/budgets | List/create budgets |
| GET/POST | /api/finance/goals | List/create goals |
| POST | /api/finance/goals/:id/contribute | Add contribution |

### Smart Square Index
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/index/calculate | Recalculate index |
| GET | /api/index/dashboard | Full dashboard data |
| GET | /api/index/insights | AI insights |
| GET | /api/health | Health check |

## Smart Square Index Algorithm

Score (0–1000) = weighted average of 5 pillars × 10:
- **Savings** (25%) — savings rate as % of income
- **Spending** (20%) — budget adherence
- **Debt** (20%) — debt-to-asset ratio
- **Goals** (20%) — average goal completion %
- **Investment** (15%) — investment rate as % of income

Grade scale: A+ ≥900, A ≥800, A- ≥750, B+ ≥700, B ≥650...

## Tech Stack
- **Backend**: Node.js, Express 4, Mongoose 8
- **Database**: MongoDB Atlas (sample_mflix)
- **Auth**: JWT + bcryptjs
- **Security**: Helmet, CORS, express-rate-limit
- **Frontend**: Vanilla JS SPA, Chart.js 4, Google Fonts
