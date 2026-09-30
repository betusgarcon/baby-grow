"""Token-bucket rate limiter for the model gateway.

Limits the number of requests per second across all callers. The bucket
is in-memory and per-process; for multi-instance deployments, a shared
Redis-backed limiter is recommended.
"""

import time
from threading import Lock


class TokenBucket:
    """In-process token bucket rate limiter."""

    def __init__(self, rate: int):
        self.rate = max(rate, 1)
        self._tokens = float(self.rate)
        self._last_update = time.time()
        self._lock = Lock()

    def _replenish(self) -> None:
        now = time.time()
        elapsed = now - self._last_update
        self._tokens = min(self.rate, self._tokens + elapsed * self.rate)
        self._last_update = now

    def acquire(self) -> bool:
        """Return True if a token is available, otherwise False."""
        with self._lock:
            self._replenish()
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return True
            return False

    def wait_time(self) -> float:
        """Estimated seconds until a token is available."""
        with self._lock:
            self._replenish()
            if self._tokens >= 1.0:
                return 0.0
            return (1.0 - self._tokens) / self.rate
