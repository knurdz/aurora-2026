import asyncio
import base64
import binascii
import hashlib
import secrets
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

from fastapi import HTTPException, UploadFile

from core.auth import enforce_limits, get_store
from core.config import settings
from core.progress_manager import progress_manager
from core.storage import decode_result_json, utc_now_iso


PipelineScheduler = Callable[[str, str, bytes], None]


@dataclass(frozen=True)
class AnalysisSubmission:
    payload: Dict[str, Any]
    headers: Dict[str, str]


def submission_limit_specs() -> list[tuple[str, int, int]]:
    return [
        ("analysis_per_hour", 60 * 60, settings.rate_limit_analysis_per_hour),
        ("analysis_per_day", 60 * 60 * 24, settings.rate_limit_analysis_per_day),
    ]


def read_limit_specs() -> list[tuple[str, int, int]]:
    return [("reads_per_minute", 60, settings.rate_limit_reads_per_minute)]


def validate_upload_bytes(filename: str, content: bytes, mime_type: Optional[str] = None) -> None:
    lower_name = (filename or "document").lower()
    if not lower_name.endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX uploads are supported")
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds the configured size limit")

    if not mime_type:
        return

    normalized_mime = mime_type.split(";", 1)[0].strip().lower()
    allowed_mimes = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    if normalized_mime and normalized_mime not in allowed_mimes:
        raise HTTPException(status_code=400, detail="Unsupported document MIME type")


def decode_base64_document(content_base64: str) -> bytes:
    raw_value = (content_base64 or "").strip()
    if raw_value.startswith("data:") and "," in raw_value:
        raw_value = raw_value.split(",", 1)[1]
    raw_value = "".join(raw_value.split())

    max_encoded_bytes = ((settings.max_upload_bytes + 2) // 3) * 4
    if len(raw_value) > max_encoded_bytes + 1024:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds the configured size limit")

    try:
        return base64.b64decode(raw_value, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="content_base64 must be valid base64") from exc


def analysis_payload(record: Dict[str, Any]) -> Dict[str, Any]:
    result = decode_result_json(record)
    if result:
        result.setdefault("status", record["status"])
        result.setdefault("doc_id", record["id"])
        result.setdefault("analysis_id", record["id"])
        return result

    payload: Dict[str, Any] = {
        "status": record["status"],
        "doc_id": record["id"],
        "analysis_id": record["id"],
        "filename": record["filename"],
        "timestamp": record["created_at"],
        "source": record["source"],
    }
    if record["status"] == "failed":
        payload["error"] = record.get("error") or "Analysis failed"
    return payload


def analysis_summary(record: Dict[str, Any]) -> Dict[str, Any]:
    payload = analysis_payload(record)
    return {
        "doc_id": payload.get("doc_id"),
        "analysis_id": payload.get("analysis_id"),
        "filename": payload.get("filename"),
        "status": payload.get("status"),
        "integrity_score": payload.get("integrity_score"),
        "integrity_verdict": payload.get("integrity_verdict"),
        "timestamp": payload.get("timestamp") or record.get("created_at"),
        "source": record.get("source"),
    }


def emit_progress(analysis_id: str, message: str) -> None:
    get_store().append_analysis_log(analysis_id, message)
    progress_manager.emit(analysis_id, message)


def build_analysis_result(analysis_id: str, filename: str, result: Dict[str, Any]) -> Dict[str, Any]:
    integrity = result.get("integrity_score") or {}
    graph = result.get("graph_results") or {}
    fraud = result.get("fraud_results") or {}
    community = graph.get("community_analysis", {})
    graph_inputs = result.get("reference_entries") or result.get("citation_mentions") or result["citations"]

    return {
        "status": "processed",
        "doc_id": analysis_id,
        "analysis_id": analysis_id,
        "filename": filename,
        "timestamp": utc_now_iso(),
        "pages_parsed": len(result["pages"]),
        "claims_found": len(result["claims"]),
        "citations_found": len(graph_inputs),
        "reference_count": len(result.get("reference_entries", [])),
        "citation_mentions_found": len(result.get("citation_mentions", [])),
        "integrity_score": integrity.get("score"),
        "integrity_verdict": integrity.get("verdict"),
        "score_breakdown": integrity.get("breakdown", {}),
        "fraud_risk": fraud.get("overall_fraud_risk"),
        "grim_failures": fraud.get("grim", {}).get("failure_count", 0),
        "p_curve_verdict": fraud.get("p_curve", {}).get("verdict"),
        "funding_conflicts": fraud.get("funding_conflicts", {}).get("conflict_count", 0),
        "citations_resolved": graph.get("resolved_count", 0),
        "retracted_papers": community.get("retracted_papers", []),
        "cartel_risk": community.get("cartel_risk"),
        "suspicious_clusters": len(community.get("suspicious_clusters", [])),
        "audit_report": result.get("audit_report"),
    }


def run_pipeline(analysis_id: str, filename: str, content: bytes) -> None:
    from core.langgraph_app import DocumentState, register_progress_callback, unregister_progress_callback, verischolar_graph

    register_progress_callback(analysis_id, lambda msg: emit_progress(analysis_id, msg))
    try:
        initial_state: DocumentState = {
            "filename": filename,
            "file_bytes": content,
            "doc_id": analysis_id,
            "document_text": "",
            "pages": [],
            "claims": [],
            "citations": [],
            "citation_mentions": [],
            "reference_entries": [],
            "graph_results": None,
            "fraud_results": None,
            "integrity_score": None,
            "audit_report": None,
        }
        result = verischolar_graph.invoke(initial_state)
        analysis_result = build_analysis_result(analysis_id, filename, result)
        get_store().set_analysis_result(analysis_id, analysis_result)
        emit_progress(analysis_id, "🏁 Complete!")
    except Exception as exc:
        import traceback

        traceback.print_exc()
        get_store().set_analysis_failed(analysis_id, str(exc))
        emit_progress(analysis_id, f"❌ Error during analysis: {str(exc)}")
    finally:
        unregister_progress_callback(analysis_id)


def schedule_pipeline_in_thread(analysis_id: str, filename: str, content: bytes) -> None:
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, run_pipeline, analysis_id, filename, content)


def background_task_scheduler(background_tasks: Any) -> PipelineScheduler:
    def schedule(analysis_id: str, filename: str, content: bytes) -> None:
        background_tasks.add_task(run_pipeline, analysis_id, filename, content)

    return schedule


async def create_analysis_job_from_upload(
    *,
    file: UploadFile,
    owner_user_id: int,
    api_key_id: Optional[int],
    source: str,
    rate_subject: str,
    schedule_pipeline: PipelineScheduler,
) -> AnalysisSubmission:
    content = await file.read()
    return create_analysis_job_from_bytes(
        filename=file.filename or "document",
        content=content,
        owner_user_id=owner_user_id,
        api_key_id=api_key_id,
        source=source,
        rate_subject=rate_subject,
        schedule_pipeline=schedule_pipeline,
    )


def create_analysis_job_from_bytes(
    *,
    filename: str,
    content: bytes,
    owner_user_id: int,
    api_key_id: Optional[int],
    source: str,
    rate_subject: str,
    schedule_pipeline: PipelineScheduler,
    mime_type: Optional[str] = None,
) -> AnalysisSubmission:
    validate_upload_bytes(filename, content, mime_type=mime_type)
    content_hash = hashlib.sha256(content).hexdigest()

    reusable = get_store().find_reusable_analysis(owner_user_id, content_hash)
    if reusable:
        return AnalysisSubmission(payload=analysis_payload(reusable), headers={})

    if get_store().count_active_analyses(owner_user_id) >= settings.rate_limit_active_analyses_per_user:
        raise HTTPException(status_code=429, detail="You already have an active analysis running")

    headers = enforce_limits(rate_subject, submission_limit_specs())

    analysis_id = secrets.token_hex(16)
    get_store().create_analysis(
        analysis_id=analysis_id,
        owner_user_id=owner_user_id,
        api_key_id=api_key_id,
        filename=filename or "document",
        source=source,
        content_hash=content_hash,
    )
    progress_manager.initialize(analysis_id)
    schedule_pipeline(analysis_id, filename or "document", content)
    return AnalysisSubmission(
        payload={"status": "processing", "doc_id": analysis_id, "analysis_id": analysis_id},
        headers=headers,
    )


def enforce_read_limit(api_key_id: int) -> Dict[str, str]:
    return enforce_limits(f"api_key:{api_key_id}:reads", read_limit_specs())


def list_analysis_summaries_for_user(user_id: int, limit: int = 50) -> list[Dict[str, Any]]:
    rows = get_store().list_analyses_for_user(user_id, limit=limit)
    return [analysis_summary(row) for row in rows]


def get_analysis_payload_for_user(user_id: int, analysis_id: str) -> Dict[str, Any]:
    record = get_store().get_analysis_for_user(user_id, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_payload(record)


def get_analysis_record_for_user(user_id: int, analysis_id: str) -> Dict[str, Any]:
    record = get_store().get_analysis_for_user(user_id, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return record


def get_analysis_events_for_user(user_id: int, analysis_id: str, after_index: int = 0) -> Dict[str, Any]:
    record = get_analysis_record_for_user(user_id, analysis_id)
    start = max(0, int(after_index or 0))
    logs = get_store().list_analysis_logs(analysis_id)
    events = [{"index": start + offset, "message": message} for offset, message in enumerate(logs[start:])]
    return {
        "analysis_id": analysis_id,
        "status": record["status"],
        "events": events,
        "next_index": len(logs),
    }


async def wait_for_analysis_events_for_user(
    user_id: int,
    analysis_id: str,
    after_index: int = 0,
    timeout_seconds: float = 30.0,
) -> Dict[str, Any]:
    record = get_analysis_record_for_user(user_id, analysis_id)
    start = max(0, int(after_index or 0))
    timeout = max(0.0, min(float(timeout_seconds), 120.0))

    logs = get_store().list_analysis_logs(analysis_id)
    if record["status"] != "processing" or len(logs) > start or timeout == 0:
        return get_analysis_events_for_user(user_id, analysis_id, start)

    q = progress_manager.register_queue(analysis_id)
    try:
        await asyncio.wait_for(q.get(), timeout=timeout)
    except asyncio.TimeoutError:
        pass
    finally:
        progress_manager.unregister_queue(analysis_id, q)

    return get_analysis_events_for_user(user_id, analysis_id, start)
