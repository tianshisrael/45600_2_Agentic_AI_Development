# Project Structure

```
lab_3_Chat_Bot/
│
├── agent.js                    # Original travel planner agent (reference)
├── server.js                   # Express.js HTTP API server
├── README.md                   # Complete documentation
├── QUICKSTART.md              # Quick start guide
├── PROJECT_STRUCTURE.md       # This file
│
└── client/                    # React + Vite frontend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    │
    ├── public/
    │   └── vite.svg
    │
    └── src/
        ├── main.jsx           # React entry point
        ├── App.jsx            # Main chat UI component
        ├── App.css            # Styling
        ├── index.css          # Global styles
        └── assets/
            └── react.svg
```

## File Descriptions

### Backend Files

- **`server.js`**: Express.js server that exposes the LangChain agent via HTTP API
  - Handles POST `/api/chat` for chat messages
  - Handles GET `/api/health` for health checks
  - Includes CORS configuration
  - Integrates with OpenRouter API

- **`agent.js`**: Original travel planner agent code (kept for reference)
  - Shows the basic LangChain setup
  - Can be used for testing the agent directly

### Frontend Files

- **`client/src/App.jsx`**: Main React component
  - Chat interface with message history
  - Travel planning form with optional fields
  - API integration with backend
  - Loading states and error handling

- **`client/src/App.css`**: Complete styling
  - Gradient backgrounds
  - Responsive design
  - Smooth animations
  - Chat bubble styling

### Documentation

- **`README.md`**: Complete project documentation
  - Architecture overview
  - Setup instructions
  - API documentation
  - Customization guide

- **`QUICKSTART.md`**: Quick start guide
  - Step-by-step setup
  - Example messages
  - Troubleshooting tips

## Technology Stack

### Backend
- Node.js (ES Modules)
- Express.js 5.x
- LangChain
- OpenRouter API (Mistral-7B)
- CORS middleware

### Frontend
- React 18
- Vite 7.x
- Modern CSS (Flexbox, Grid, Animations)
- Fetch API for HTTP requests

## API Flow

```
User Input (React)
    ↓
POST /api/chat
    ↓
Express Server
    ↓
LangChain Agent
    ↓
OpenRouter API (Mistral-7B)
    ↓
AI Response
    ↓
JSON Response
    ↓
React UI Update
```

## Environment Variables

Required in `.env` file at project root:

```
OPENROUTER_API_KEY=your-key-here
PORT=3001
```

## NPM Scripts

From project root:

```bash
npm run chatbot:server    # Start backend server
npm run chatbot:client    # Start frontend dev server
```

## Development Workflow

1. Start backend: `npm run chatbot:server`
2. Start frontend: `npm run chatbot:client` (in new terminal)
3. Open browser to `http://localhost:5173`
4. Make changes to code (hot reload enabled)
5. Test in browser

## Production Considerations

For production deployment:

1. Build frontend: `cd client && npm run build`
2. Serve static files from Express
3. Use environment variables for configuration
4. Add rate limiting
5. Implement authentication
6. Add logging and monitoring
7. Use a process manager (PM2)
8. Set up reverse proxy (nginx)