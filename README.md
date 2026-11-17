# AI-Powered LinkedIn Content Studio

An enterprise-ready, modular studio designed to research current industry news, generate high-performing LinkedIn posts, humanize writing to match personal author styles, generate visual assets and carousels, and preview everything in a real-time creator dashboard.

---

## Architecture Overview

- **Monorepo Structure**: Complete separation between `client/` and `server/`.
- **Frontend**: Next.js App Router, React 19, Tailwind CSS, Responsive Design, and Native JavaScript (no TypeScript).
- **Backend**: Node.js & Express.js with native ES Modules (`"type": "module"`).
- **Separation of Concerns**: Strict 3-tier layered architecture (`routes/` -> `controllers/` -> `services/` -> `models/`).
- **Prompt Engineering**: Prompts isolated into individual parameterizable modules in `prompts/`.
- **Task Queue & Cache**: BullMQ powered by Redis for background AI generation and web research.
- **Storage**: Cloudinary SDK for persistent image and carousel asset hosting.
- **Validation & Security**: Zod runtime schema validation for request payloads and environment variables; Helmet and CORS security headers.
- **Centralized Error Handling & Logging**: Standardized `ApiError` hierarchy, Winston structured logging, and Morgan HTTP profiling.
- **Multi-User Ready**: Mongoose schemas designed from the foundation with `userId` tenancy bindings.

---

## Project Structure

```
Content-Manager/
├── ARCHITECTURE.md                  # Detailed system architecture document
├── README.md                        # Documentation and operations guide
├── package.json                     # Monorepo runner scripts (concurrently)
├── .gitignore                       # Global git ignore configuration
│
├── client/                          # Next.js App Router Frontend
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.js
│   ├── jsconfig.json                # Root alias resolution (@/*)
│   ├── .env.example                 # Example client environment variables
│   ├── .env.local                   # Active client environment variables
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
└── server/                          # Express.js Backend (ESM)
    ├── package.json                 # Native ES Modules ("type": "module")
    ├── .env.example                 # Example server environment variables
    ├── .env                         # Active server environment variables
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

### Backend (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```

| Key | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend listening port | `5000` |
| `NODE_ENV` | Environment (`development` \| `production` \| `test`) | `development` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:3000` |
| `MONGO_URI` | MongoDB connection URI | `mongodb://localhost:27017/linkedin_content_studio` |
| `REDIS_HOST` | Redis host | `127.0.0.1` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD`| Redis password (optional) | `""` |
| `OPENAI_API_KEY`| OpenAI API key | *Required for live AI generation* |
| `OPENAI_MODEL` | Text generation model | `gpt-4o-mini` |
| `OPENAI_IMAGE_MODEL`| Image generation model | `dall-e-3` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier | *Required for live CDN* |
| `CLOUDINARY_API_KEY` | Cloudinary API key | *Required for live CDN* |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | *Required for live CDN* |

### Frontend (`client/.env.local`)
Copy `client/.env.example` to `client/.env.local`:
```bash
cp client/.env.example client/.env.local
```

| Key | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## How to Run the Application

### 1. Install All Dependencies
From the repository root:
```bash
npm run install:all
```

### 2. Run Both Services Concurrently
```bash
npm run dev
```
This runs:
- **Frontend**: Next.js App Router at [http://localhost:3000](http://localhost:3000)
- **Backend**: Express API server at [http://localhost:5000](http://localhost:5000)

### 3. Run Services Individually
- **Backend only**:
  ```bash
  npm run dev:server
  ```
- **Frontend only**:
  ```bash
  npm run dev:client
  ```

---

## Health Check & Verification Endpoints

- **Liveness Ping**:
  ```
  GET http://localhost:5000/api/health/ping
  ```
  Response:
  ```json
  {
    "statusCode": 200,
    "data": {
      "service": "linkedin-content-studio-api",
      "status": "online",
      "timestamp": "2026-11-17T06:21:00.000Z",
      "uptimeSeconds": 12,
      "environment": "development"
    },
    "message": "Service is healthy",
    "success": true
  }
  ```

- **Subsystem Readiness**:
  ```
  GET http://localhost:5000/api/health/ready
  ```
  Response:
  ```json
  {
    "statusCode": 200,
    "data": {
      "status": "ready",
      "timestamp": "2026-11-17T06:21:00.000Z",
      "systems": {
        "database": { "status": "disconnected", "isConnected": false },
        "redis": { "status": "disconnected", "isConnected": false },
        "cloudinary": { "isConfigured": false, "cloudName": "mock/unconfigured" },
        "aiService": { "isConfigured": false, "textModel": "gpt-4o-mini", "imageModel": "dall-e-3" }
      }
    },
    "message": "Readiness check complete",
    "success": true
  }
  ```

