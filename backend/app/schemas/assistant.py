from typing import Optional, List
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|model)$", description="Role of the message author")
    content: str = Field(..., min_length=1, max_length=10000, description="Message text content")


class AssistantChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=100, description="Conversation history including latest question")


class AssistantChatResponse(BaseModel):
    reply: str
    suggested_tab: Optional[str] = Field(None, description="Suggested FinTrack tab to navigate to (e.g., 'budgets', 'goals', 'expenses')")
