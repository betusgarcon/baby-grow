"""Tests for OpenTelemetry telemetry helpers.

Covers the no-OTLP fallback and metric counter creation paths.
"""

import pytest
from opentelemetry import metrics, trace

from app.telemetry import get_meter, get_tracer, init_telemetry


def test_get_tracer_and_meter():
    """After initialization, get_tracer/get_meter should return usable handles."""
    init_telemetry()

    tracer = get_tracer("test")
    meter = get_meter("test")

    assert tracer is not None
    assert meter is not None

    counter = meter.create_counter("test.counter", unit="1", description="Test counter")
    counter.add(1)

    with tracer.start_as_current_span("test.span") as span:
        assert span is not None

