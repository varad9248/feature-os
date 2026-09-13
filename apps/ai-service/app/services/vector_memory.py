import numpy as np
import hashlib
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class IncidentMemoryRecord(BaseModel):
    id: str
    flag_key: str
    summary: str
    root_cause: Optional[str] = None
    resolution_details: Optional[str] = None
    similarity_score: float = 0.0
    created_at: str


class IncidentSearchRequest(BaseModel):
    query: str
    flag_key: Optional[str] = None
    top_k: int = 5


class IncidentSearchResponse(BaseModel):
    query: str
    total_matches: int
    matches: List[IncidentMemoryRecord]
    rag_synthesis: str


class VectorMemoryEngine:
    """
    Semantic Vector Memory Engine with Dense Vector Cosine Similarity Search
    for Autonomous Incident Triage and Explainable AI Decisions.
    """

    def __init__(self, dimension: int = 128):
        self.dimension = dimension
        self.corpus: List[Dict[str, Any]] = []
        self._seed_default_memories()

    def _seed_default_memories(self):
        """Seed initial realistic incident memory corpus"""
        default_incidents = [
            {
                "id": "inc-mem-001",
                "flag_key": "checkout-v2",
                "summary": "Circuit breaker tripped OPEN due to 500 internal server error storm during flash checkout spike",
                "root_cause": "Database connection pool exhaustion on payment gateway microservice",
                "resolution_details": "Autonomous failover to cached secondary payment provider; pool max connections increased to 500",
                "created_at": "2026-09-08T14:32:00Z",
            },
            {
                "id": "inc-mem-002",
                "flag_key": "dark-mode-v2",
                "summary": "P99 latency degradation breached 450ms SLA gate during Canary rollout (Ring 1)",
                "root_cause": "Uncached CSS-in-JS style injection recalculations in client browser runtime",
                "resolution_details": "Canary rollout autonomously halted; rollout percentage reverted to 0%; pre-compiled CSS bundle deployed",
                "created_at": "2026-09-10T11:20:00Z",
            },
            {
                "id": "inc-mem-003",
                "flag_key": "recommendations-ai",
                "summary": "High memory leak detected in vector similarity query worker nodes",
                "root_cause": "Unreleased memory pointers in NumPy matrix dot product cache",
                "resolution_details": "Garbage collector cycle forced every 1,000 iterations; worker containers restarted with memory hard limits",
                "created_at": "2026-09-11T09:15:00Z",
            },
            {
                "id": "inc-mem-004",
                "flag_key": "pricing-tier-enterprise",
                "summary": "Discovered behavioral anomaly in South America cohort experiencing 8.2% error rate",
                "root_cause": "Regional currency conversion API timeout in Sao Paulo AWS region",
                "resolution_details": "Dynamic targeting rule synthesized: South America cohort excluded from rollout until regional CDN cached exchange rates",
                "created_at": "2026-09-12T16:45:00Z",
            },
        ]

        for inc in default_incidents:
            text = f"{inc['summary']} {inc.get('root_cause', '')} {inc.get('resolution_details', '')}"
            vec = self._embed(text)
            self.corpus.append({**inc, "vector": vec})

    def _embed(self, text: str) -> np.ndarray:
        """
        Deterministic normalized dense semantic vector representation (D=128)
        using character n-gram hashing and term frequency.
        """
        vec = np.zeros(self.dimension, dtype=np.float32)
        words = text.lower().replace("-", " ").replace("_", " ").split()

        for w in words:
            # 1. Full word hash
            idx1 = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16) % self.dimension
            vec[idx1] += 2.0

            # 2. Sub-word character trigrams
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    trigram = w[i : i + 3]
                    idx2 = (
                        int(hashlib.sha256(trigram.encode("utf-8")).hexdigest(), 16)
                        % self.dimension
                    )
                    vec[idx2] += 1.0

        # L2-normalization for cosine similarity
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def index_incident(
        self,
        incident_id: str,
        flag_key: str,
        summary: str,
        root_cause: Optional[str] = None,
        resolution_details: Optional[str] = None,
        created_at: Optional[str] = None,
    ) -> None:
        text = f"{summary} {root_cause or ''} {resolution_details or ''}"
        vector = self._embed(text)
        self.corpus.append(
            {
                "id": incident_id,
                "flag_key": flag_key,
                "summary": summary,
                "root_cause": root_cause,
                "resolution_details": resolution_details,
                "vector": vector,
                "created_at": created_at or "2026-09-13T12:00:00Z",
            }
        )

    def search_similar(
        self, query: str, flag_key: Optional[str] = None, top_k: int = 5
    ) -> IncidentSearchResponse:
        query_vec = self._embed(query)
        scored_matches = []

        for item in self.corpus:
            item_vec = item["vector"]
            # Cosine similarity: dot product of normalized vectors
            sim = float(np.dot(query_vec, item_vec))

            # Slight boost if same flagKey
            if flag_key and item["flag_key"] == flag_key:
                sim = min(1.0, sim + 0.1)

            scored_matches.append((sim, item))

        # Sort descending by similarity
        scored_matches.sort(key=lambda x: x[0], reverse=True)
        top_matches = scored_matches[:top_k]

        results: List[IncidentMemoryRecord] = []
        for sim, item in top_matches:
            results.append(
                IncidentMemoryRecord(
                    id=item["id"],
                    flag_key=item["flag_key"],
                    summary=item["summary"],
                    root_cause=item.get("root_cause"),
                    resolution_details=item.get("resolution_details"),
                    similarity_score=round(max(0.0, min(1.0, sim)), 4),
                    created_at=item["created_at"],
                )
            )

        # RAG Synthesis Formulation
        if results and results[0].similarity_score >= 0.35:
            best = results[0]
            rag_synthesis = (
                f"Historical Precedent Found ({round(best.similarity_score * 100, 1)}% semantic match): "
                f"Previous outage on '{best.flag_key}' had root cause: '{best.root_cause}'. "
                f"Recommended Autonomous Mitigation: '{best.resolution_details}'."
            )
        else:
            rag_synthesis = (
                "Novel incident pattern detected. No identical previous outage found in vector memory. "
                "Defaulting to standard circuit breaker quarantine and telemetry isolation."
            )

        return IncidentSearchResponse(
            query=query,
            total_matches=len(results),
            matches=results,
            rag_synthesis=rag_synthesis,
        )


vector_memory_engine = VectorMemoryEngine()
