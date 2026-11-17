# AI-Powered LinkedIn Content Studio

An enterprise-ready, modular studio designed to research current industry news, generate high-performing LinkedIn posts, humanize writing to match personal author styles, generate visual assets and carousels, and preview everything in a real-time creator dashboard.

---

## Folder Structure

The project has **only two main folders**: `frontend` and `backend`. All respective dependencies, configurations, and code live strictly inside their own directory.

```
Content-Manager/
├── README.md                        # Documentation and run instructions
├── .gitignore                       # Global git ignore configuration
│
├── frontend/                        # Next.js App Router Frontend (JavaScript)
│   ├── package.json                 # Frontend dependencies & scripts
│   ├── package-lock.json
│   ├── next.config.mjs
│   ├── tailwind.config.js
│   ├── jsconfig.json                # Root alias resolution (@/*)
│   ├── .env.example                 # Example client environment variables
│   ├── .env.local                   # Active client environment variables
│   ├── node_modules/                # Frontend dependencies
│   ├── public/                      # Static assets
│   └── src/
│       ├── app/
│       │   ├── layout.js            # Root layout
│       │   ├── page.js              # Content Studio dashboard & health view
│       │   └── globals.css          # Tailwind base styling
│       ├── components/
│       │   ├── layout/
│       │   │   └── Navbar.js        # Navigation header
│       │   └── dashboard/
│       │       └── HealthStatus.js  # Live backend subsystem monitor
│       └── services/
│           └── api.js               # Reusable frontend API client
│
└── backend/                         # Express.js Backend (Native ES Modules)
    ├── package.json                 # Backend dependencies & scripts ("type": "module")
    ├── package-lock.json
    ├── .env.example                 # Example server environment variables
    ├── .env                         # Active server environment variables
    ├── node_modules/                # Backend dependencies
    └── src/
        ├── app.js                   # Express application setup
        ├── server.js                # Server entrypoint and graceful shutdown
        ├── config/
        │   ├── env.js               # Zod-validated environment config
        │   ├── db.js                # MongoDB Mongoose connection manager
        │   ├── redis.js             # ioredis Redis connection manager
        │   └── cloudinary.js        # Cloudinary SDK configuration
        ├── controllers/
        │   └── health.controller.js # /api/health/ping & /api/health/ready
        ├── middlewares/
        │   ├── errorHandler.js      # Centralized error handler
        │   ├── validate.js          # Reusable Zod validation middleware
        │   └── requestLogger.js     # Morgan HTTP logger stream to Winston
        ├── models/
        │   ├── User.js              # Multi-tenant user schema
        │   ├── WritingProfile.js    # Personal writing tone & style schema
        │   ├── Topic.js             # Curated industry topics schema
        │   └── Post.js              # Generated LinkedIn post schema
        ├── prompts/
        │   ├── index.js             # Prompts exporter
        │   ├── newsResearch.prompt.js
        │   ├── postGeneration.prompt.js
        │   ├── humanizeWriting.prompt.js
        │   └── imageGeneration.prompt.js
        ├── routes/
        │   ├── index.js             # Root API router (/api)
        │   └── health.routes.js     # /api/health endpoints
        ├── schemas/
        │   └── health.schema.js     # Health request Zod schemas
        ├── services/
        │   ├── ai/
        │   │   └── openai.service.js      # Reusable OpenAI client wrapper
        │   ├── storage/
        │   │   └── cloudinary.service.js  # Reusable Cloudinary upload service
        │   └── queue/
        │       └── queue.service.js       # BullMQ queue & worker manager
        └── utils/
            ├── apiError.js          # Standardized operational error class
            ├── apiResponse.js       # Standardized JSON response envelope
            ├── asyncHandler.js      # Async controller wrapper
            └── logger.js            # Winston structured logging utility
```

---

## Environment Variables

### Backend (`backend/.env`)
Template available in `backend/.env.example`:
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

MONGO_URI=mongodb://localhost:27017/linkedin_content_studio

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

OPENAI_API_KEY=mock-key-replace-with-real-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=dall-e-3

CLOUDINARY_CLOUD_NAME=mock_cloud_name
CLOUDINARY_API_KEY=mock_api_key
CLOUDINARY_API_SECRET=mock_api_secret
```

### Frontend (`frontend/.env.local`)
Template available in `frontend/.env.example`:
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## How to Run the Application

Since both folders are completely self-contained, you run each service from its own directory:

### 1. Run Backend Server
```bash
cd backend
npm run dev
```
- Listens on `http://localhost:5000`
- Live ping endpoint: `http://localhost:5000/api/health/ping`
- Live readiness check: `http://localhost:5000/api/health/ready`

### 2. Run Frontend Client
In a separate terminal:
```bash
cd frontend
npm run dev
```
- Available at `http://localhost:3000`
- Displays the interactive Content Studio dashboard and verifies backend connection in real time.
