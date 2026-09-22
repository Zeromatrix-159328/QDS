"""
Core configuration for the FastAPI application.
Centralizes all settings for CORS, API versioning, and app metadata.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional



class Settings(BaseSettings):
    """Application settings loaded from environment variables or defaults."""

    # ── Application Metadata ──────────────────────────────────────────
    APP_TITLE: str = "QDS — Quantum Digital Signature Security API"
    APP_DESCRIPTION: str = (
        "Module 3: Distributed Node API Framework for the Quantum-Inspired "
        "Cyber Threat Detection system. Exposes Alice, Bob, Arbitrator, "
        "Security, and Attack endpoints as independent logical nodes."
    )
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    # ── CORS ──────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",   # React default
        "http://localhost:5173",   # Vite default
        "http://localhost:5174",   # Vite alternate
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:8000",
        "https://adpooja-2007.github.io",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # ── Quantum Simulation Defaults ───────────────────────────────────
    DEFAULT_NUM_PAIRS: int = 1000
    DEFAULT_BASELINE_NOISE: float = 0.02
    DEFAULT_ALPHA: float = 1e-6
    DEFAULT_CHSH_MINIMUM: float = 2.0

    # ── Database (PostgreSQL) ──────────────────────────────────────────
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "qds_db"
    DATABASE_URL: Optional[str] = None

    @property
    def async_database_url(self) -> str:
        """Construct async PostgreSQL database connection URL."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # ── Telemetry ─────────────────────────────────────────────────────

    TELEMETRY_MAX_ENTRIES: int = 10000

    # ── Browser Security & Attack Mitigations ───────────────────────────
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_FILE_EXTENSIONS: List[str] = [
        ".png", ".jpg", ".jpeg", ".gif", ".webp",
        ".pdf", ".txt", ".json", ".csv", ".docx", ".xlsx", ".zip"
    ]
    BLOCKED_FILE_EXTENSIONS: List[str] = [
        ".html", ".htm", ".svg", ".exe", ".bat", ".cmd", ".sh",
        ".vbs", ".js", ".mjs", ".py", ".php", ".scr", ".msi", ".dll",
        ".com", ".jar", ".ps1", ".hta"
    ]

    # Content Security Policy (CSP)
    CSP_HEADER: str = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self' http://localhost:* http://127.0.0.1:* ws: wss:; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none';"
    )

    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 3000
    AUTH_RATE_LIMIT_PER_MINUTE: int = 300

    # ── Session ───────────────────────────────────────────────────────
    SESSION_EXPIRY_SECONDS: int = 3600  # 1 hour

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )



# Singleton instance
settings = Settings()
