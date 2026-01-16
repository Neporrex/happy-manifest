from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import os
from dotenv import load_dotenv
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

from api.auth import router as auth_router
from api.routes.config import router as config_router
from api.routes.guilds import router as guilds_router

load_dotenv()

app = FastAPI(
    title="Happy Bot API",
    description="API for Happy Discord Bot configuration and management",
    version="1.0.0"
)

DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://happy-manifest.vercel.app/dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        DASHBOARD_URL,
        "http://localhost:5173",
        "https://happy-manifest.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all your API routes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(config_router, prefix="/api/config", tags=["Configuration"])
app.include_router(guilds_router, prefix="/api/guilds", tags=["Guilds"])

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/docs")
async def docs_redirect():
    """Redirect to FastAPI docs"""
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000)),
        reload=True
    )
