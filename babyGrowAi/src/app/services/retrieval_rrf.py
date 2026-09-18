"""Hybrid retrieval: vector + full-text with RRF fusion.

This module is intentionally small and self-contained so the main
`RetrievalService` can import it without pulling in heavy dependencies.
"""

from typing import Any


def reciprocal_rank_fusion(rank_lists: list[dict[Any, float]], k: int = 60) -> list[tuple[Any, float]]:
    """Merge several ranked lists of (id, score) into a single score-sorted list.

    Each `rank_lists[i]` is a dict mapping an item id to a score. The item's
    rank within that list is computed from the score (higher = better).
    RRF score = sum(1 / (k + rank_i)) across all lists.

    Args:
        rank_lists: List of score dictionaries, one per retrieval method.
        k: RRF constant. Default 60 is the classic value.

    Returns:
        List of (id, rrf_score) sorted by descending score.
    """
    scores: dict[Any, float] = {}
    for lst in rank_lists:
        # Sort ids by descending score to derive ranks.
        sorted_ids = sorted(lst.items(), key=lambda x: x[1], reverse=True)
        for rank, (item_id, _score) in enumerate(sorted_ids, start=1):
            scores[item_id] = scores.get(item_id, 0.0) + 1.0 / (k + rank)

    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
