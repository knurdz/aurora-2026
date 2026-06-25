import asyncio
from typing import Dict, List, Optional

class ProgressManager:
    def __init__(self):
        self.logs: Dict[str, List[str]] = {}
        self.queues: Dict[str, List[asyncio.Queue]] = {}
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    def initialize(self, doc_id: str):
        self.logs[doc_id] = []
        self.queues[doc_id] = []

    def emit(self, doc_id: str, message: str):
        if doc_id not in self.logs:
            self.logs[doc_id] = []
        self.logs[doc_id].append(message)

        if doc_id in self.queues:
            for q in self.queues[doc_id]:
                if self.loop and self.loop.is_running():
                    self.loop.call_soon_threadsafe(q.put_nowait, message)
                else:
                    try:
                        q.put_nowait(message)
                    except Exception:
                        pass

    def register_queue(self, doc_id: str) -> asyncio.Queue:
        q = asyncio.Queue()
        if doc_id not in self.queues:
            self.queues[doc_id] = []
        self.queues[doc_id].append(q)
        return q

    def unregister_queue(self, doc_id: str, q: asyncio.Queue):
        if doc_id in self.queues:
            if q in self.queues[doc_id]:
                self.queues[doc_id].remove(q)

progress_manager = ProgressManager()
