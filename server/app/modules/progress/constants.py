from typing import Literal

PersonalRecordType = Literal[
    "WEIGHT",
    "ESTIMATED_1RM",
    "REPS_AT_WEIGHT",
    "SET_VOLUME",
]


ProgressRange = Literal[
    "7D",
    "4W",
    "12W",
    "6M",
    "1Y",
    "ALL",
]


MuscleRange = Literal[
    "7D",
    "4W",
    "12W",
]


WeightUnit = Literal[
    "KG",
    "LB",
]


WORKING_SET_TYPES = frozenset(
    {
        "NORMAL",
        "BACKOFF",
        "DROP",
        "FAILURE",
        "AMRAP",
    }
)


E1RM_MAX_REPS = 12

LB_TO_KG = 0.45359237
