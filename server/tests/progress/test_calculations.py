import pytest

from app.modules.progress.calculations import (
    calculate_epley_1rm_kg,
    calculate_set_volume_kg,
    is_pr_eligible_set,
    is_working_set,
    kg_to_lb,
    lb_to_kg,
)


def set_doc(
    *,
    set_type="NORMAL",
    completed=True,
    weight=100,
    unit="KG",
    reps=5,
):
    return {
        "type": set_type,
        "completed": completed,
        "weight": weight,
        "weight_unit": unit,
        "reps": reps,
    }


def test_lb_to_kg():
    assert lb_to_kg(100) == pytest.approx(45.359237)


def test_kg_to_lb():
    assert kg_to_lb(100) == pytest.approx(
        220.462262,
        rel=1e-5,
    )


def test_warmup_not_working():
    assert not is_working_set(set_doc(set_type="WARMUP"))


def test_incomplete_not_working():
    assert not is_working_set(set_doc(completed=False))


def test_normal_completed_is_working():
    assert is_working_set(set_doc())


def test_volume():
    assert calculate_set_volume_kg(
        set_doc(
            weight=80,
            reps=10,
        )
    ) == pytest.approx(800)


def test_epley():
    assert calculate_epley_1rm_kg(
        set_doc(
            weight=80,
            reps=5,
        )
    ) == pytest.approx(93.3333333)


def test_single_rep_is_weight():
    assert calculate_epley_1rm_kg(
        set_doc(
            weight=100,
            reps=1,
        )
    ) == pytest.approx(100)


def test_e1rm_ignored_above_12_reps():
    assert (
        calculate_epley_1rm_kg(
            set_doc(
                weight=50,
                reps=13,
            )
        )
        is None
    )


def test_zero_reps_not_pr_eligible():
    assert not is_pr_eligible_set(set_doc(reps=0))


def test_bodyweight_reps_are_pr_eligible():
    assert is_pr_eligible_set(
        set_doc(
            weight=None,
            reps=15,
        )
    )
