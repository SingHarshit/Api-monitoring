from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

import numpy as np
from sklearn.ensemble import IsolationForest


@dataclass(frozen=True)
class IsolationForestResult:
    is_anomaly: bool
    anomaly_score: float
    decision_score: float
    training_observations: int


class IsolationForestModel:
    """
    Isolation Forest anomaly detector.

    The model is trained on historical feature rows and then evaluates
    the current feature row separately.
    """

    DEFAULT_FEATURES = (
        "latency_mean_ms",
        "latency_median_ms",
        "latency_p95_ms",
        "error_rate",
        "timeout_rate",
        "latency_std_ms",
    )

    def __init__(
        self,
        *,
        feature_names: Sequence[str] | None = None,
        contamination: str | float = "auto",
        n_estimators: int = 100,
        max_samples: str | int | float = "auto",
        random_state: int = 42,
        min_training_observations: int = 10,
    ) -> None:
        if min_training_observations < 2:
            raise ValueError(
                "min_training_observations must be at least 2"
            )

        self.feature_names = tuple(
            feature_names or self.DEFAULT_FEATURES
        )
        self.min_training_observations = min_training_observations
        self._training_observations = 0

        self._model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            max_samples=max_samples,
            random_state=random_state,
        )
        self._is_fitted = False

    def _to_feature_vector(
        self,
        features: Mapping[str, Any],
    ) -> list[float]:
        values: list[float] = []

        for feature_name in self.feature_names:
            value = features.get(feature_name, 0.0)

            if value is None:
                value = 0.0

            try:
                numeric_value = float(value)
            except (TypeError, ValueError) as error:
                raise ValueError(
                    f"Feature '{feature_name}' must be numeric"
                ) from error

            if not np.isfinite(numeric_value):
                raise ValueError(
                    f"Feature '{feature_name}' must be finite"
                )

            values.append(numeric_value)

        return values

    def _to_feature_matrix(
        self,
        historical_features: Sequence[Mapping[str, Any]],
    ) -> np.ndarray:
        if not historical_features:
            raise ValueError(
                "At least one historical observation is required"
            )

        matrix = np.array(
            [
                self._to_feature_vector(features)
                for features in historical_features
            ],
            dtype=float,
        )

        if matrix.ndim != 2:
            raise ValueError("Historical features must form a 2D matrix")

        return matrix

    def fit(
        self,
        historical_features: Sequence[Mapping[str, Any]],
    ) -> IsolationForestModel:
        """
        Train the model using historical observations only.
        """

        matrix = self._to_feature_matrix(historical_features)

        if len(matrix) < self.min_training_observations:
            raise ValueError(
                "Insufficient historical observations: "
                f"expected at least {self.min_training_observations}, "
                f"received {len(matrix)}"
            )

        self._model.fit(matrix)
        self._training_observations = len(matrix)
        self._is_fitted = True

        return self

    def predict(
        self,
        current_features: Mapping[str, Any],
    ) -> IsolationForestResult:
        """
        Evaluate one current observation after historical training.
        """

        if not self._is_fitted:
            raise RuntimeError(
                "The Isolation Forest model must be fitted first"
            )

        current_vector = np.array(
            [self._to_feature_vector(current_features)],
            dtype=float,
        )

        prediction = int(self._model.predict(current_vector)[0])
        decision_score = float(
            self._model.decision_function(current_vector)[0]
        )
        raw_score = float(
            self._model.score_samples(current_vector)[0]
        )

        return IsolationForestResult(
            is_anomaly=prediction == -1,
            anomaly_score=round(-raw_score, 6),
            decision_score=round(decision_score, 6),
            training_observations=self._training_observations,
        )

    def fit_predict(
        self,
        historical_features: Sequence[Mapping[str, Any]],
        current_features: Mapping[str, Any],
    ) -> IsolationForestResult:
        """
        Fit on historical observations, then evaluate the current one.
        """

        self.fit(historical_features)
        return self.predict(current_features)