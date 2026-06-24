import networkx as nx
import community as community_louvain
from neo4j import GraphDatabase
from core.config import settings
from typing import List, Dict, Any


def detect_citation_communities(doi_list: List[str]) -> Dict[str, Any]:
    """
    Pull CITES edges for the document's resolved papers from Neo4j,
    build a NetworkX graph, run Louvain community detection,
    and flag clusters that look like citation cartels.

    A cartel signal: small cluster (≥3 papers) where papers overwhelmingly
    cite each other — high internal edge density (>0.5).
    Density thresholds:
      > 0.75 → high risk
      > 0.50 → medium risk
    """
    if not doi_list:
        return {
            "communities": [],
            "suspicious_clusters": [],
            "retracted_papers": [],
            "cartel_risk": "no_data",
            "modularity_score": 0.0,
        }

    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    G = nx.DiGraph()
    retracted_papers: List[dict] = []

    try:
        with driver.session() as session:
            # Only fetch edges within this document's citation set —
            # scoped subgraph keeps Louvain fast regardless of total DB size
            edges = session.run(
                """
                MATCH (a:Paper)-[:CITES]->(b:Paper)
                WHERE a.doi IN $dois AND b.doi IN $dois
                RETURN a.doi AS source, b.doi AS target
                """,
                dois=doi_list,
            )
            for record in edges:
                G.add_edge(record["source"], record["target"])

            # Collect retracted papers for the integrity report
            retracted = session.run(
                """
                MATCH (p:Paper)
                WHERE p.doi IN $dois AND p.is_retracted = true
                RETURN p.doi AS doi, p.title AS title
                """,
                dois=doi_list,
            )
            for record in retracted:
                retracted_papers.append(
                    {"doi": record["doi"], "title": record["title"]}
                )
    finally:
        driver.close()

    # Louvain needs at least 2 connected nodes
    if len(G.nodes) < 2:
        return {
            "communities": [],
            "suspicious_clusters": [],
            "retracted_papers": retracted_papers,
            "cartel_risk": "insufficient_data",
            "modularity_score": 0.0,
        }

    # Louvain operates on undirected graphs
    G_undirected = G.to_undirected()
    partition: Dict[str, int] = community_louvain.best_partition(G_undirected)

    # Group nodes by community ID
    buckets: Dict[int, List[str]] = {}
    for node, comm_id in partition.items():
        buckets.setdefault(comm_id, []).append(node)

    # Flag suspicious clusters
    suspicious: List[dict] = []
    for comm_id, members in buckets.items():
        if len(members) < 3:
            # Too small to meaningfully assess cartel behaviour
            continue
        subgraph = G.subgraph(members)
        density = nx.density(subgraph)
        if density > 0.5:
            suspicious.append(
                {
                    "community_id": comm_id,
                    "members": members,
                    "density": round(density, 3),
                    "internal_edges": subgraph.number_of_edges(),
                    "risk_level": "high" if density > 0.75 else "medium",
                }
            )

    return {
        "communities": [
            {"id": cid, "members": members, "size": len(members)}
            for cid, members in buckets.items()
        ],
        "suspicious_clusters": suspicious,
        "retracted_papers": retracted_papers,
        "cartel_risk": "high" if suspicious else "low",
        "modularity_score": _safe_modularity(G_undirected, partition),
    }


def _safe_modularity(G: nx.Graph, partition: dict) -> float:
    """Compute modularity score; returns 0.0 on any error."""
    try:
        return round(community_louvain.modularity(partition, G), 4)
    except Exception:
        return 0.0
