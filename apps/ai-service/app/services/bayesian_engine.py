import numpy as np
from scipy import stats
from typing import List, Dict, Any
from pydantic import BaseModel


class VariantInput(BaseModel):
    key: str
    name: str
    sample_count: int
    conversions: int


class PosteriorDensityPoint(BaseModel):
    x: float  # Conversion rate (e.g. 0.08)
    density: float  # Beta probability density


class VariantAnalysisResult(BaseModel):
    key: str
    name: str
    sample_count: int
    conversions: int
    conversion_rate: float
    credible_interval_95: List[float]  # [2.5% quantile, 97.5% quantile]
    p2bb: float  # Probability to be Best (0.0 to 1.0)
    relative_lift: float  # Relative lift compared to control variant
    expected_loss: float
    posterior_density_curve: List[PosteriorDensityPoint]


class ExperimentAnalysisResponse(BaseModel):
    experiment_id: str
    variants: List[VariantAnalysisResult]
    recommended_winner: str | None
    winner_confidence: float
    can_stop_early: bool
    summary: str


class BayesianExperimentEngine:
    def __init__(self, prior_alpha: float = 1.0, prior_beta: float = 1.0):
        self.prior_alpha = prior_alpha
        self.prior_beta = prior_beta

    def analyze_experiment(
        self, experiment_id: str, variants: List[VariantInput]
    ) -> ExperimentAnalysisResponse:
        """
        Bayesian Beta-Binomial conjugate updating with 10,000 Monte Carlo draws
        """
        n_variants = len(variants)
        if n_variants == 0:
            raise ValueError("At least one variant required for analysis")

        n_simulations = 10000
        simulated_rates = np.zeros((n_variants, n_simulations))
        control_cr = (
            variants[0].conversions / max(1, variants[0].sample_count)
            if variants[0].sample_count > 0
            else 0.05
        )

        results: List[VariantAnalysisResult] = []

        # 1. Update Posteriors & draw Monte Carlo samples
        for i, v in enumerate(variants):
            alpha_post = self.prior_alpha + v.conversions
            beta_post = self.prior_beta + (v.sample_count - v.conversions)
            if beta_post <= 0:
                beta_post = 1.0

            # Draw samples
            simulated_rates[i, :] = np.random.beta(alpha_post, beta_post, n_simulations)

            # 95% Credible Interval
            ci_low = float(stats.beta.ppf(0.025, alpha_post, beta_post))
            ci_high = float(stats.beta.ppf(0.975, alpha_post, beta_post))

            # Current empirical conversion rate
            cr = v.conversions / max(1, v.sample_count)
            lift = ((cr - control_cr) / max(0.001, control_cr)) * 100 if i > 0 else 0.0

            # Generate 40 discrete points along the density curve
            curve_points: List[PosteriorDensityPoint] = []
            x_range = np.linspace(max(0, ci_low * 0.7), min(1.0, ci_high * 1.3), 40)
            for x_val in x_range:
                density = float(stats.beta.pdf(x_val, alpha_post, beta_post))
                curve_points.append(
                    PosteriorDensityPoint(x=round(float(x_val), 4), density=round(density, 3))
                )

            results.append(
                VariantAnalysisResult(
                    key=v.key,
                    name=v.name,
                    sample_count=v.sample_count,
                    conversions=v.conversions,
                    conversion_rate=round(cr, 4),
                    credible_interval_95=[round(ci_low, 4), round(ci_high, 4)],
                    p2bb=0.0,  # calculated below
                    relative_lift=round(lift, 2),
                    expected_loss=0.0,
                    posterior_density_curve=curve_points,
                )
            )

        # 2. Compute Probability to be Best (P2BB) across 10,000 draws
        # best_indices is an array of size n_simulations indicating which variant won each draw
        best_indices = np.argmax(simulated_rates, axis=0)

        for i in range(n_variants):
            p2bb = float(np.sum(best_indices == i) / n_simulations)
            results[i].p2bb = round(p2bb, 4)

            # Compute Expected Loss: max(best) - variant[i]
            max_rates = np.max(simulated_rates, axis=0)
            expected_loss = float(np.mean(np.maximum(0, max_rates - simulated_rates[i, :])))
            results[i].expected_loss = round(expected_loss, 5)

        # 3. Determine winner and early stopping trigger (P2BB >= 95%)
        sorted_by_p2bb = sorted(results, key=lambda r: r.p2bb, reverse=True)
        top_variant = sorted_by_p2bb[0]

        can_stop_early = top_variant.p2bb >= 0.95 and top_variant.sample_count >= 200
        recommended_winner = top_variant.key if can_stop_early else None
        winner_confidence = top_variant.p2bb

        if can_stop_early:
            summary = f"Statistical significance reached! Variant '{top_variant.name}' has a {round(top_variant.p2bb * 100, 1)}% probability of being the best performing experience (Lift: +{top_variant.relative_lift}%). Early stopping recommended."
        else:
            summary = f"Experiment accumulating telemetry. Variant '{top_variant.name}' is currently leading with {round(top_variant.p2bb * 100, 1)}% P2BB, but additional sample volume is required to reach 95% credible threshold."

        return ExperimentAnalysisResponse(
            experiment_id=experiment_id,
            variants=results,
            recommended_winner=recommended_winner,
            winner_confidence=winner_confidence,
            can_stop_early=can_stop_early,
            summary=summary,
        )


bayesian_experiment_engine = BayesianExperimentEngine()
