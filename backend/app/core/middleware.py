"""
Telemetry middleware for the FastAPI application.
Captures request timing, IDs, and session correlation for every API call.
"""

import time
import uuid
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

logger = logging.getLogger("qds.telemetry")


class TelemetryEntry:
    """Represents a single telemetry log entry."""

    __slots__ = (
        "request_id", "endpoint", "method", "timestamp",
        "execution_time_ms", "status_code", "session_id", "error", "client_ip"
    )

    def __init__(
        self,
        request_id: str,
        endpoint: str,
        method: str,
        timestamp: str,
        execution_time_ms: float,
        status_code: int,
        session_id: Optional[str] = None,
        error: Optional[str] = None,
        client_ip: Optional[str] = None,
    ):
        self.request_id = request_id
        self.endpoint = endpoint
        self.method = method
        self.timestamp = timestamp
        self.execution_time_ms = execution_time_ms
        self.status_code = status_code
        self.session_id = session_id
        self.error = error
        self.client_ip = client_ip

    def to_dict(self) -> dict:
        return {
            "request_id": self.request_id,
            "endpoint": self.endpoint,
            "method": self.method,
            "timestamp": self.timestamp,
            "execution_time_ms": round(self.execution_time_ms, 3),
            "status_code": self.status_code,
            "session_id": self.session_id,
            "error": self.error,
            "client_ip": self.client_ip,
        }


# ── Global telemetry store (bounded ring buffer) ──────────────────────
telemetry_store: deque = deque(maxlen=settings.TELEMETRY_MAX_ENTRIES)


class TelemetryMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts every request to record:
    - Unique request ID
    - Endpoint path and HTTP method
    - ISO 8601 timestamp
    - Execution time in milliseconds (via time.perf_counter)
    - HTTP status code
    - Associated session ID (extracted from path or body when available)
    - Error information if the response indicates failure
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        timestamp = datetime.now(timezone.utc).isoformat()

        # Inject request_id into request state for downstream use
        request.state.request_id = request_id

        # Try to extract session_id from path parameters
        session_id = self._extract_session_id(request)

        # Extract client IP
        client_ip = self._extract_client_ip(request)

        try:
            response = await call_next(request)
            execution_time_ms = (time.perf_counter() - start_time) * 1000

            entry = TelemetryEntry(
                request_id=request_id,
                endpoint=str(request.url.path),
                method=request.method,
                timestamp=timestamp,
                execution_time_ms=execution_time_ms,
                status_code=response.status_code,
                session_id=session_id,
                error=None if response.status_code < 400 else f"HTTP {response.status_code}",
                client_ip=client_ip,
            )

            telemetry_store.append(entry)

            # Log the telemetry entry
            logger.info(
                "%s %s %s %.1fms %s",
                request.method,
                request.url.path,
                response.status_code,
                execution_time_ms,
                f"session={session_id}" if session_id else "",
            )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as exc:
            execution_time_ms = (time.perf_counter() - start_time) * 1000

            entry = TelemetryEntry(
                request_id=request_id,
                endpoint=str(request.url.path),
                method=request.method,
                timestamp=timestamp,
                execution_time_ms=execution_time_ms,
                status_code=500,
                session_id=session_id,
                error=str(exc),
                client_ip=client_ip,
            )

            telemetry_store.append(entry)

            logger.error(
                "%s %s ERROR %.1fms %s — %s",
                request.method,
                request.url.path,
                execution_time_ms,
                f"session={session_id}" if session_id else "",
                str(exc),
            )

            raise

    @staticmethod
    def _extract_session_id(request: Request) -> Optional[str]:
        """
        Attempt to extract a session_id from the URL path.
        Looks for path segments matching the QKD-* pattern.
        """
        path_parts = request.url.path.strip("/").split("/")
        for part in path_parts:
            if part.startswith("QKD-"):
                return part
        return None

    @staticmethod
    def _extract_client_ip(request: Request) -> str:
        """Extract the real client IP, checking X-Forwarded-For header first."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        if request.client:
            return request.client.host
        return "127.0.0.1"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that injects industry-standard HTTP security headers onto every response
    to block browser-based attacks:
    - Content-Security-Policy (XSS, code injection, unauthorized scripts)
    - X-Frame-Options: DENY (Clickjacking & UI Redressing)
    - X-Content-Type-Options: nosniff (MIME Sniffing drive-by execution)
    - X-XSS-Protection: 1; mode=block (Reflected XSS filter)
    - Referrer-Policy: strict-origin-when-cross-origin (Information leakage)
    - Permissions-Policy: camera=(), microphone=(), etc. (Unauthorized device exploitation)
    - Cross-Origin-Opener-Policy: same-origin (Spectre / Window Hijacking)
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # Do not block Swagger UI / ReDoc CDN assets on documentation endpoints
        if request.url.path in ("/docs", "/redoc", "/openapi.json", "/docs/oauth2-redirect"):
            return response

        # Instate browser attack mitigations
        response.headers["Content-Security-Policy"] = settings.CSP_HEADER
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=(), "
            "accelerometer=(), gyroscope=(), magnetometer=()"
        )
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"

        return response


# ── Sliding Window Rate Limiting Store ───────────────────────────────
_rate_limit_records: dict[str, list[float]] = {}

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiting middleware to mitigate DoS, credential stuffing,
    and automated message injection attacks against quantum API endpoints.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = TelemetryMiddleware._extract_client_ip(request)
        now = time.time()
        window_size = 60.0  # 1 minute sliding window

        # Determine rate limit based on endpoint sensitivity
        path = request.url.path
        is_sensitive = any(
            p in path for p in ("/auth/login", "/auth/register", "/chat/send")
        )
        max_requests = (
            settings.AUTH_RATE_LIMIT_PER_MINUTE if is_sensitive
            else settings.RATE_LIMIT_REQUESTS_PER_MINUTE
        )

        key = f"{client_ip}:{path if is_sensitive else 'global'}"

        if key not in _rate_limit_records:
            _rate_limit_records[key] = []

        # Clean timestamps older than window_size
        timestamps = [t for t in _rate_limit_records[key] if now - t < window_size]
        _rate_limit_records[key] = timestamps

        if len(timestamps) >= max_requests:
            logger.warning(
                "Rate limit exceeded for %s on %s (%d/%d req/min)",
                client_ip, path, len(timestamps), max_requests
            )
            from starlette.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "detail": "Too many requests. Rate limit exceeded. Please wait a minute.",
                    "client_ip": client_ip,
                },
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        _rate_limit_records[key].append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - len(timestamps) - 1))
        return response
