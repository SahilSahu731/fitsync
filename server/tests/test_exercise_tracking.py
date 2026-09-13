import pytest
from fastapi import HTTPException

from app.modules.exercises.tracking import (
    validate_metrics,
)


def test_weight_reps_allows_weight_and_reps():
    validate_metrics(
        "WEIGHT_REPS",
        weight=100,
        reps=8,
        duration_seconds=None,
        distance_meters=None,
    )


def test_duration_rejects_weight():
    with pytest.raises(HTTPException):
        validate_metrics(
            "DURATION",
            weight=100,
            reps=None,
            duration_seconds=60,
            distance_meters=None,
        )


def test_duration_accepts_duration():
    validate_metrics(
        "DURATION",
        weight=None,
        reps=None,
        duration_seconds=90,
        distance_meters=None,
    )


def test_distance_duration_accepts_both():
    validate_metrics(
        "DISTANCE_DURATION",
        weight=None,
        reps=None,
        duration_seconds=1800,
        distance_meters=5000,
    )


def test_weight_distance_accepts_weight_distance():
    validate_metrics(
        "WEIGHT_DISTANCE",
        weight=40,
        reps=None,
        duration_seconds=None,
        distance_meters=30,
    )


def test_reps_only_rejects_distance():
    with pytest.raises(HTTPException):
        validate_metrics(
            "REPS_ONLY",
            weight=None,
            reps=20,
            duration_seconds=None,
            distance_meters=100,
        )
