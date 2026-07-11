"""EverOS memory management for Cortex learning agents."""

import time
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

from .config import init_everos_client


class MemoryType(str, Enum):
    """EverOS memory types."""
    EPISODIC = "episodic_memory"
    PROFILE = "profile"
    FORESIGHT = "foresight"
    EVENTLOG = "eventlog"
    AGENT_CASE = "agent_case"
    AGENT_SKILL = "agent_skill"
    AGENT_MEMORY = "agent_memory"


class RetrievalMethod(str, Enum):
    """EverOS retrieval methods."""
    KEYWORD = "keyword"
    VECTOR = "vector"
    HYBRID = "hybrid"
    AGENTIC = "agentic"


@dataclass
class Message:
    """Message to add to EverOS memory."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[int] = None
    sender_id: Optional[str] = None  # for group chats

    def to_dict(self) -> dict:
        """Convert to EverOS API format."""
        msg = {
            "role": self.role,
            "timestamp": self.timestamp or int(time.time() * 1000),
            "content": self.content,
        }
        if self.sender_id:
            msg["sender_id"] = self.sender_id
        return msg


class EverOSMemoryManager:
    """Manages student learning memory with EverOS."""

    def __init__(self, user_id: str, session_id: Optional[str] = None):
        """Initialize memory manager.

        Args:
            user_id: Student/user identifier
            session_id: Optional session identifier for grouping conversations
        """
        self.client = init_everos_client()
        self.memories = self.client.v1.memories
        self.user_id = user_id
        self.session_id = session_id or f"session_{int(time.time())}"

    def add_messages(
        self,
        messages: List[Message],
        async_mode: bool = True,
    ) -> dict:
        """Add conversation messages to memory.

        Args:
            messages: List of Message objects
            async_mode: If True (default), messages are queued for async processing

        Returns:
            dict: Response data with status
        """
        msg_dicts = [m.to_dict() for m in messages]

        response = self.memories.add(
            user_id=self.user_id,
            session_id=self.session_id,
            messages=msg_dicts,
            async_mode=async_mode,
        )

        return response.data if response.data else {}

    def flush(self) -> dict:
        """Trigger memory consolidation.

        Forces the system to immediately extract and consolidate memories
        instead of waiting for async processing.

        Returns:
            dict: Response data with extraction status
        """
        response = self.memories.flush(user_id=self.user_id)
        return response.data if response.data else {}

    def search(
        self,
        query: str,
        method: RetrievalMethod = RetrievalMethod.HYBRID,
        memory_types: Optional[List[MemoryType]] = None,
        top_k: int = 5,
    ) -> dict:
        """Search for relevant memories.

        Args:
            query: Search query
            method: Retrieval method (keyword, vector, hybrid, agentic)
            memory_types: Filter to specific memory types
            top_k: Number of results to return

        Returns:
            dict: Search results with episodes, profiles, etc.
        """
        type_strs = [t.value for t in (memory_types or [])]

        response = self.memories.search(
            filters={"user_id": self.user_id},
            query=query,
            method=method.value,
            memory_types=type_strs if type_strs else None,
            top_k=top_k,
        )

        return response.data if response.data else {}

    def get_profile(self) -> dict:
        """Get user's consolidated profile.

        Returns profile data including preferences, learning style, progress.

        Returns:
            dict: Profile memory data
        """
        response = self.memories.get(
            filters={"user_id": self.user_id},
            memory_type="profile",
        )

        return response.data if response.data else {}

    def get_episodes(self, page: int = 1, page_size: int = 10) -> dict:
        """Get episodic memories (conversation summaries).

        Args:
            page: Page number
            page_size: Results per page

        Returns:
            dict: Episodic memory data
        """
        response = self.memories.get(
            filters={"user_id": self.user_id},
            memory_type="episodic_memory",
            page=page,
            page_size=page_size,
        )

        return response.data if response.data else {}

    def get_learning_context(
        self,
        topic: str,
        include_progress: bool = True,
    ) -> dict:
        """Get learning context for a topic.

        Combines profile, episodic memories, and optional progress.

        Args:
            topic: Subject/topic being learned
            include_progress: Include progress/scores if available

        Returns:
            dict: Contextual learning data
        """
        # Get learning style and preferences from profile
        profile_search = self.search(
            query=f"learning style preferences for {topic}",
            method=RetrievalMethod.VECTOR,
            memory_types=[MemoryType.PROFILE],
            top_k=3,
        )

        # Get relevant episodes
        episode_search = self.search(
            query=f"{topic} learning progress",
            method=RetrievalMethod.HYBRID,
            memory_types=[MemoryType.EPISODIC],
            top_k=5,
        )

        context = {
            "topic": topic,
            "profile": profile_search.get("profiles", []),
            "episodes": episode_search.get("episodes", []),
        }

        if include_progress:
            # Get factual progress data
            progress_search = self.search(
                query=f"{topic} score quiz test result",
                method=RetrievalMethod.KEYWORD,
                memory_types=[MemoryType.EVENTLOG],
                top_k=10,
            )
            context["progress"] = progress_search.get("eventlog", [])

        return context

    def record_learning_session(
        self,
        topic: str,
        summary: str,
        score: Optional[float] = None,
    ) -> dict:
        """Record a learning session.

        Args:
            topic: What was studied
            summary: Summary of the session
            score: Optional performance score (0-100)

        Returns:
            dict: Response from memory system
        """
        content = f"Learning session: {topic}. {summary}"
        if score is not None:
            content += f" Score: {score}/100"

        message = Message(
            role="user",
            content=content,
        )

        return self.add_messages([message], async_mode=False)

    def delete_memory(self, memory_id: str) -> dict:
        """Delete a specific memory by ID.

        Args:
            memory_id: ID of the memory to delete

        Returns:
            dict: Response data
        """
        response = self.memories.delete(
            user_id=self.user_id,
            memory_id=memory_id,
        )

        return response.data if response.data else {}
