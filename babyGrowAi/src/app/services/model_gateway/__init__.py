"""Model gateway package exports and compatibility helpers.

Callers should prefer `get_model_gateway_router()` to obtain the unified
router. The legacy `get_model_gateway()` API in
`app.services.ollama_gateway` is preserved for backward compatibility.
"""

from app.services.model_gateway.base import BaseModelGateway, ModelRequest, ModelResponse
from app.services.model_gateway.router import (
    ModelGatewayRouter,
    get_model_gateway_router,
    reset_model_gateway_router,
)

__all__ = [
    "BaseModelGateway",
    "ModelRequest",
    "ModelResponse",
    "ModelGatewayRouter",
    "get_model_gateway_router",
    "reset_model_gateway_router",
]
