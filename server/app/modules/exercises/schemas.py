import re
from typing import Annotated

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)

from app.modules.exercises.models import (
    Equipment,
    ExerciseDocument,
    ExerciseMechanic,
    ExerciseMediaDocument,
    ExerciseMediaType,
    ExerciseSource,
    MovementPattern,
    MuscleGroup,
)


def normalize_exercise_name(
    value: str,
) -> str:
    return " ".join(
        value
        .strip()
        .lower()
        .split()
    )


class ExerciseMediaInput(
    BaseModel
):
    type: ExerciseMediaType

    public_id: str = Field(
        min_length=1,
        max_length=500,
    )

    width: int | None = Field(
        default=None,
        ge=0,
    )

    height: int | None = Field(
        default=None,
        ge=0,
    )

    duration_seconds: (
        float | None
    ) = Field(
        default=None,
        ge=0,
        le=3600,
    )

    format: str | None = Field(
        default=None,
        max_length=20,
    )

    sort_order: int = Field(
        ge=0,
        le=10,
    )


class ExerciseMediaResponse(
    BaseModel
):
    id: str

    type: ExerciseMediaType

    public_id: str

    secure_url: str

    thumbnail_url: str

    width: int | None

    height: int | None

    duration_seconds: float | None

    format: str | None

    sort_order: int

    @classmethod
    def from_document(
        cls,
        media: ExerciseMediaDocument,
    ) -> "ExerciseMediaResponse":
        return cls(
            **media
        )


class ExerciseCreateRequest(
    BaseModel
):
    name: str = Field(
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    primary_muscles: list[
        MuscleGroup
    ] = Field(
        min_length=1,
        max_length=5,
    )

    secondary_muscles: list[
        MuscleGroup
    ] = Field(
        default_factory=list,
        max_length=8,
    )

    equipment: list[
        Equipment
    ] = Field(
        default_factory=list,
        max_length=5,
    )

    mechanic: ExerciseMechanic

    movement_pattern: MovementPattern

    instructions: list[str] = Field(
        default_factory=list,
        max_length=15,
    )

    tips: list[str] = Field(
        default_factory=list,
        max_length=15,
    )

    media: list[
        ExerciseMediaInput
    ] = Field(
        default_factory=list,
        max_length=3,
    )

    @field_validator(
        "name"
    )
    @classmethod
    def clean_name(
        cls,
        value: str,
    ) -> str:
        return " ".join(
            value.strip().split()
        )

    @field_validator(
        "description"
    )
    @classmethod
    def clean_description(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()

        return (
            cleaned
            if cleaned
            else None
        )

    @field_validator(
        "instructions",
        "tips",
    )
    @classmethod
    def clean_string_list(
        cls,
        values: list[str],
    ) -> list[str]:
        return [
            cleaned
            for value in values
            if (
                cleaned := (
                    " ".join(
                        value
                        .strip()
                        .split()
                    )
                )
            )
        ]


class ExerciseUpdateRequest(
    ExerciseCreateRequest
):
    pass


class ExerciseResponse(
    BaseModel
):
    id: str

    source: ExerciseSource

    name: str

    description: str | None

    primary_muscles: list[
        MuscleGroup
    ]

    secondary_muscles: list[
        MuscleGroup
    ]

    equipment: list[
        Equipment
    ]

    mechanic: ExerciseMechanic

    movement_pattern: MovementPattern

    instructions: list[str]

    tips: list[str]

    media: list[
        ExerciseMediaResponse
    ]

    is_custom: bool

    can_edit: bool

    @classmethod
    def from_document(
        cls,
        exercise: ExerciseDocument,
        *,
        current_user_id,
    ) -> "ExerciseResponse":
        custom = (
            exercise[
                "source"
            ]
            == "CUSTOM"
        )

        editable = (
            custom
            and exercise[
                "owner_user_id"
            ]
            == current_user_id
        )

        media = sorted(
            exercise.get(
                "media",
                [],
            ),
            key=lambda item: (
                item[
                    "sort_order"
                ]
            ),
        )

        return cls(
            id=str(
                exercise["_id"]
            ),
            source=exercise[
                "source"
            ],
            name=exercise[
                "name"
            ],
            description=exercise.get(
                "description"
            ),
            primary_muscles=exercise[
                "primary_muscles"
            ],
            secondary_muscles=exercise[
                "secondary_muscles"
            ],
            equipment=exercise[
                "equipment"
            ],
            mechanic=exercise[
                "mechanic"
            ],
            movement_pattern=exercise[
                "movement_pattern"
            ],
            instructions=exercise.get(
                "instructions",
                [],
            ),
            tips=exercise.get(
                "tips",
                [],
            ),
            media=[
                ExerciseMediaResponse
                .from_document(
                    item
                )
                for item in media
            ],
            is_custom=custom,
            can_edit=editable,
        )


class ExerciseListResponse(
    BaseModel
):
    items: list[
        ExerciseResponse
    ]

    next_cursor: str | None


class ExerciseArchiveResponse(
    BaseModel
):
    message: str


ExerciseLimit = Annotated[
    int,
    Field(
        ge=1,
        le=100,
    ),
]


def is_valid_search_query(
    value: str,
) -> bool:
    return bool(
        re.search(
            r"[a-zA-Z0-9]",
            value,
        )
    )