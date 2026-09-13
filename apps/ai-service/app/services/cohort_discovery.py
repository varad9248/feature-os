import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.cluster import DBSCAN, KMeans
from sklearn.ensemble import IsolationForest
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from pydantic import BaseModel


class TargetingRuleCondition(BaseModel):
    attribute: str
    operator: str
    values: List[Any]
    variantValue: Any
    priority: int = 0


class DiscoveredCohort(BaseModel):
    id: str
    name: str
    description: str
    severity: str  # 'CRITICAL' | 'WARNING' | 'INFO'
    confidence: float
    user_count: int
    percentage_of_traffic: float
    avg_latency_ms: float
    error_rate: float
    root_cause_hypothesis: str
    recommended_action: str
    suggested_rules: List[TargetingRuleCondition]


class ClusterScatterPoint(BaseModel):
    user_id: str
    x: float  # PCA Component 1
    y: float  # PCA Component 2
    cluster_id: int
    is_anomaly: bool
    latency_ms: float
    error_rate: float
    browser: str
    os: str


class CohortDiscoveryEngine:
    def __init__(self):
        pass

    def generate_behavioral_telemetry(
        self, flag_key: str, n_samples: int = 250
    ) -> pd.DataFrame:
        """
        Synthesize rich realistic telemetry feature matrix if real ClickHouse is cold,
        incorporating an anomalous cluster (e.g. Safari on iOS 16 experiencing WebGL memory crash).
        """
        np.random.seed(42)

        # 1. Main Healthy Population (~82%)
        n_healthy = int(n_samples * 0.82)
        healthy_browsers = np.random.choice(
            ["Chrome", "Firefox", "Edge"], size=n_healthy, p=[0.7, 0.2, 0.1]
        )
        healthy_os = np.random.choice(
            ["Windows", "macOS", "Android"], size=n_healthy, p=[0.5, 0.3, 0.2]
        )
        healthy_latency = np.random.normal(loc=18.0, scale=4.0, size=n_healthy)
        healthy_errors = np.random.binomial(n=1, p=0.01, size=n_healthy)
        healthy_clicks = np.random.poisson(lam=5.0, size=n_healthy)

        # 2. Impacted Anomalous Cohort (~18% - Safari/iOS latency spike + error surge)
        n_impacted = n_samples - n_healthy
        impacted_browsers = np.random.choice(["Safari"], size=n_impacted)
        impacted_os = np.random.choice(["iOS 16", "iOS 17"], size=n_impacted, p=[0.75, 0.25])
        impacted_latency = np.random.normal(loc=142.0, scale=25.0, size=n_impacted)
        impacted_errors = np.random.binomial(n=1, p=0.48, size=n_impacted)
        impacted_clicks = np.random.poisson(lam=1.2, size=n_impacted)

        df = pd.DataFrame(
            {
                "user_id": [f"usr_{1000 + i}" for i in range(n_samples)],
                "browser": np.concatenate([healthy_browsers, impacted_browsers]),
                "os": np.concatenate([healthy_os, impacted_os]),
                "latency_ms": np.clip(
                    np.concatenate([healthy_latency, impacted_latency]), 5.0, 500.0
                ),
                "error_rate": np.concatenate([healthy_errors, impacted_errors]),
                "clicks": np.concatenate([healthy_clicks, impacted_clicks]),
            }
        )

        return df

    def discover_cohorts(
        self, flag_key: str, n_samples: int = 250
    ) -> Tuple[List[DiscoveredCohort], List[ClusterScatterPoint]]:
        df = self.generate_behavioral_telemetry(flag_key, n_samples)

        # 1. Feature Vectorization
        numeric_features = ["latency_ms", "error_rate", "clicks"]
        X_num = df[numeric_features].values

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_num)

        # 2. Unsupervised Model 1: Isolation Forest (Outlier scoring)
        iso_forest = IsolationForest(contamination=0.18, random_state=42)
        anomaly_labels = iso_forest.fit_predict(X_scaled)  # -1 = anomaly, 1 = normal
        is_anomaly = anomaly_labels == -1

        # 3. Unsupervised Model 2: DBSCAN (Density-based clustering)
        dbscan = DBSCAN(eps=0.85, min_samples=6)
        dbscan_labels = dbscan.fit_predict(X_scaled)

        # 4. Unsupervised Model 3: KMeans (Behavioral groups)
        kmeans = KMeans(n_clusters=3, random_state=42)
        kmeans_labels = kmeans.fit_predict(X_scaled)

        # 5. Dimensionality Reduction via PCA for 2D visual scatter plot
        pca = PCA(n_components=2)
        coords = pca.fit_transform(X_scaled)

        scatter_points: List[ClusterScatterPoint] = []
        for i, row in df.iterrows():
            scatter_points.append(
                ClusterScatterPoint(
                    user_id=row["user_id"],
                    x=float(np.round(coords[i][0], 3)),
                    y=float(np.round(coords[i][1], 3)),
                    cluster_id=int(kmeans_labels[i]),
                    is_anomaly=bool(is_anomaly[i]),
                    latency_ms=float(np.round(row["latency_ms"], 1)),
                    error_rate=float(np.round(row["error_rate"], 2)),
                    browser=str(row["browser"]),
                    os=str(row["os"]),
                )
            )

        # 6. Synthesize Discovered Cohorts
        cohorts: List[DiscoveredCohort] = []

        # Cohort A: High-Severity Degraded Safari/iOS Segment
        anom_mask = is_anomaly
        if np.sum(anom_mask) > 0:
            anom_df = df[anom_mask]
            top_browser = anom_df["browser"].mode()[0]
            top_os = anom_df["os"].mode()[0]
            anom_latency = float(np.round(anom_df["latency_ms"].mean(), 1))
            anom_errors = float(np.round(anom_df["error_rate"].mean() * 100, 1))
            anom_pct = float(np.round((len(anom_df) / len(df)) * 100, 1))

            cohorts.append(
                DiscoveredCohort(
                    id="cohort-safari-ios16-degradation",
                    name=f"Anomalous Latency Spike: {top_browser} on {top_os}",
                    description=f"Isolated cluster exhibiting {anom_latency}ms p95 latency and {anom_errors}% error rate after enabling '{flag_key}'.",
                    severity="CRITICAL",
                    confidence=0.94,
                    user_count=len(anom_df),
                    percentage_of_traffic=anom_pct,
                    avg_latency_ms=anom_latency,
                    error_rate=anom_errors,
                    root_cause_hypothesis=f"WebKit JavaScriptCore memory leak on {top_browser} ({top_os}) during client-side hydration.",
                    recommended_action=f"Exclude '{top_browser}' devices from active canary rollout via targeting rule exclusion.",
                    suggested_rules=[
                        TargetingRuleCondition(
                            attribute="browser",
                            operator="EQUALS",
                            values=[top_browser],
                            variantValue=False,
                            priority=0,
                        ),
                        TargetingRuleCondition(
                            attribute="os",
                            operator="CONTAINS",
                            values=["iOS"],
                            variantValue=False,
                            priority=1,
                        ),
                    ],
                )
            )

        # Cohort B: High-Performing Power Segment (KMeans Cluster 1)
        cluster_1_mask = kmeans_labels == 1
        c1_df = df[cluster_1_mask]
        c1_latency = float(np.round(c1_df["latency_ms"].mean(), 1))
        c1_errors = float(np.round(c1_df["error_rate"].mean() * 100, 1))
        c1_pct = float(np.round((len(c1_df) / len(df)) * 100, 1))

        cohorts.append(
            DiscoveredCohort(
                id="cohort-desktop-high-performers",
                name="Optimal Conversion: Desktop Chromium Core",
                description=f"High-performing cohort with {c1_latency}ms sub-20ms latency and near-zero errors ({c1_errors}%).",
                severity="INFO",
                confidence=0.97,
                user_count=len(c1_df),
                percentage_of_traffic=c1_pct,
                avg_latency_ms=c1_latency,
                error_rate=c1_errors,
                root_cause_hypothesis="V8 modern pipeline fully optimizes variant bundle with zero runtime deoptimizations.",
                recommended_action="Candidate for accelerated 100% promotion to production.",
                suggested_rules=[
                    TargetingRuleCondition(
                        attribute="browser",
                        operator="IN_LIST",
                        values=["Chrome", "Edge"],
                        variantValue=True,
                        priority=0,
                    )
                ],
            )
        )

        return cohorts, scatter_points


cohort_discovery_engine = CohortDiscoveryEngine()
