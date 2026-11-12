# Vyapar Sangam (व्यापार संगम)

> **India's Premier Business Succession and Acquisition Marketplace**  
> Connecting retiring or transitioning business owners with qualified entrepreneurs, investors, and successors.

---

## 🏛️ Project Architecture Overview

Vyapar Sangam is architected as a clean, decoupled full-stack application:
- **Frontend**: React.js with Vite, vanilla modular CSS & HTML5, Lucide icons, React Router DOM.
- **Backend**: Python Django REST Framework (DRF) organized into modular feature apps.
- **Database**: PostgreSQL (production-ready relational database).
- **Communication**: RESTful JSON API with CORS and token-based authentication support.
- **Independent**: 100% independent codebase with zero Base44 dependencies or proprietary SDKs.

```
VyaparSangam_Independent/
├── backend/                         # Django REST Framework Backend
│   ├── apps/                        # Modular Django Apps
│   │   ├── accounts/                # User authentication, roles (Buyer/Seller/Advisor)
│   │   ├── listings/                # Business listings, sectors, financials
│   │   ├── inquiries/               # Acquisition inquiries, NDA agreements
│   │   └── core/                    # Shared models & utilities
│   ├── vyapar_sangam/               # Project configuration (settings, URLs, WSGI/ASGI)
│   ├── manage.py
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Backend environment variable template
│   └── .gitignore
│
├── frontend/                        # React.js with Vite
│   ├── public/                      # Static assets & favicon
│   ├── src/
│   │   ├── assets/styles/           # Design system (variables.css, main.css)
│   │   ├── components/              # Reusable UI components (Navbar, Footer, Button, Layout)
│   │   ├── pages/                   # Route pages (Home, Listings, BusinessDetail, Sell, Auth)
│   │   ├── services/                # Axios API services for DRF backend
│   │   ├── context/                 # State management (AuthContext)
│   │   ├── utils/                   # Helpers (INR currency formatter, date utilities)
│   │   ├── App.jsx                  # Client routing setup
│   │   └── main.jsx                 # Application entry point
│   ├── index.html
│   ├── package.json                 # Frontend dependencies & scripts
│   ├── vite.config.js               # Vite config with API proxy
│   ├── .env.example                 # Frontend environment variables template
│   └── .gitignore
│
├── docker-compose.yml               # Optional local PostgreSQL service
├── .gitignore                       # Root git ignore
└── README.md                        # Documentation & setup guide
```

---

## 🎨 Visual Identity & Styling

The frontend styling strictly preserves the visual identity of Vyapar Sangam:
- **Primary Navy (`#0F172A`)**: Reflects executive trust, stability, and corporate heritage.
- **Indian Gold / Saffron (`#F59E0B`)**: Represents enterprise prosperity and deal celebration.
- **Emerald Green (`#10B981`)**: Denotes verified business accounts and successfully closed successions.
- **Clean Slate Background (`#F8FAFC`)**: Provides readability and modern minimalism.

Styling is implemented in `src/assets/styles/variables.css` and `main.css`, accessible to beginners without complex CSS framework dependencies.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or v20+ and `npm`
- **Python**: 3.10+ and `pip`
- **PostgreSQL**: Local instance or Docker

---

### 2. Backend Setup (Django + PostgreSQL)

1. Open your terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update database credentials in `.env` to match your local PostgreSQL database.
   - *(Optional)* If using Docker, run PostgreSQL from the project root:
     ```bash
     docker-compose up -d
     ```

5. Run database migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. Create a superuser to access the Django Admin:
   ```bash
   python manage.py createsuperuser
   ```

7. Start the Django development server:
   ```bash
   python manage.py runserver
   ```
   Backend will be running at `http://127.0.0.1:8000/`.

---

### 3. Frontend Setup (React + Vite)

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Frontend will be running at `http://localhost:5173/`.

---

## 📌 Next Steps
The project structure has been initialized. Once you are ready, the next development phases will involve:
1. Setting up backend authentication endpoints (Registration, Login, JWT/Token).
2. Implementing business listing models, admin filters, and CRUD endpoints.
3. Implementing inquiry submission and standard NDA workflows.
4. Building out responsive React UI screens (Listing search/filters, Business profile, Seller onboarding form).
