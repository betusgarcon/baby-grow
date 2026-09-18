"""OpenTelemetry initialization and helpers for the AI service.

Provides a single entry point to configure traces and metrics, plus helpers
that the rest of the application can use to create spans and instruments.
"""

import logging
import os

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import ConsoleMetricExporter, PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

logger = logging.getLogger(__name__)


SERVICE_NAME = "baby-grow-ai"
SERVICE_VERSION = "0.1.0"


# Cached meter/metric handles are module-level so callers don't recreate them.
_meter: metrics.Meter | None = None


def init_telemetry(service_name: str = SERVICE_NAME, otlp_endpoint: str | None = None) -> None:
    """Initialize tracer and meter once at startup.

    Args:
        service_name: Used as the `service.name` resource attribute.
        otlp_endpoint: Optional OTLP gRPC endpoint. If omitted, spans and
            metrics are exported to the console (useful for local dev).
    """
    endpoint = otlp_endpoint or os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": SERVICE_VERSION,
            "deployment.environment": os.getenv("DEPLOYMENT_ENVIRONMENT", "local"),
        }
    )

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    if endpoint:
        tracer_provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
        )
    else:
        tracer_provider.add_span_processor(
            BatchSpanProcessor(ConsoleSpanExporter(out=open(os.devnull, "w")))
        )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    if endpoint:
        # OTLP metrics exporter is available but console is enough for local dev.
        # Use console to avoid requiring a metrics backend for the interview demo.
        reader = PeriodicExportingMetricReader(ConsoleMetricExporter(out=open(os.devnull, "w")))
    else:
        reader = PeriodicExportingMetricReader(ConsoleMetricExporter(out=open(os.devnull, "w")))
    provider = MeterProvider(resource=resource, metric_readers=[reader])
    metrics.set_meter_provider(provider)

    global _meter
    _meter = metrics.get_meter(service_name)

    logger.info("Telemetry initialized: endpoint=%s", endpoint or "console")


def get_tracer(name: str = "app") -> trace.Tracer:
    """Return a tracer for the given component name."""
    return trace.get_tracer(name)


def get_meter(name: str = "app") -> metrics.Meter:
    """Return a meter for the given component name."""
    return metrics.get_meter(name)
