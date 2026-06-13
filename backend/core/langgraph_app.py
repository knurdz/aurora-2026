from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional

class DocumentState(TypedDict):
    document_text: str
    claims: List[str]
    citations: List[dict]
    graph_results: Optional[dict]
    fraud_results: Optional[dict]
    integrity_score: Optional[float]
    audit_report: Optional[str]

def claim_isolation_agent(state: DocumentState) -> DocumentState:
    # Phase 2: parse doc, extract claims & citations
    return state

def citation_graph_agent(state: DocumentState) -> DocumentState:
    # Phase 3: build Neo4j citation graph, detect cartels
    return state

def fraud_detection_agent(state: DocumentState) -> DocumentState:
    # Phase 4: p-curve, GRIM, statistical checks
    return state

def consensus_agent(state: DocumentState) -> DocumentState:
    # Phase 5: compute score, generate report
    return state

def build_graph() -> StateGraph:
    graph = StateGraph(DocumentState)

    graph.add_node("claim_isolation", claim_isolation_agent)
    graph.add_node("citation_graph", citation_graph_agent)
    graph.add_node("fraud_detection", fraud_detection_agent)
    graph.add_node("consensus", consensus_agent)

    graph.set_entry_point("claim_isolation")

    # citation_graph and fraud_detection run in parallel after claim isolation
    graph.add_edge("claim_isolation", "citation_graph")
    graph.add_edge("claim_isolation", "fraud_detection")

    # both feed into consensus
    graph.add_edge("citation_graph", "consensus")
    graph.add_edge("fraud_detection", "consensus")
    graph.add_edge("consensus", END)

    return graph.compile()

verischolar_graph = build_graph()