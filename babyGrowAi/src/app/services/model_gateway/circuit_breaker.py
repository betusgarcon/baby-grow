"""Circuit breaker for model gateway providers.

Prevents cascading failures by short-circuiting a provider that has
tripped a failure threshold. After a recovery timeout, the breaker
enters half-open state and allows a single probe.
"""

import time
from threading import Lock


class CircuitBreaker:
    """Simple in-memory circuit breaker."""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failures = 0
        self._last_failure_time: float | None = None
        self._state = "closed"
        self._lock = Lock()

    @property
    def state(self) -> str:
        with self._lock:
            if self._state == "open" and self._last_failure_time is not None:
                elapsed = time.time() - self._last_failure_time
                if elapsed >= self.recovery_timeout:
                    self._state = "half-open"
            return self._state

    def can_execute(self) -> bool:
        return self.state in ("closed", "half-open")

    def record_success(self) -> None:
        with self._lock:
            self._failures = 0
            self._last_failure_time = None
            self._state = "closed"

    def record_failure(self) -> None:
        with self._lock:
            self._failures += 1
            self._last_failure_time = time.time()
            if self._failures >= self.failure_threshold:
                self._state = "open"
