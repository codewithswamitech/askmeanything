import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Integer, Float, JSON,
    ForeignKey, Enum as SAEnum, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from crewai_service.core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    display_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("ResearchSession", back_populates="user")


class ResearchSession(Base):
    __tablename__ = "research_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    query = Column(Text, nullable=False)
    status = Column(String(50), default="pending", index=True)
    summary = Column(Text, nullable=True)
    report = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    user_answers = Column(Text, nullable=True)
    search_strategy = Column(JSON, nullable=True)
    total_searches = Column(Integer, default=0)
    total_pages_scraped = Column(Integer, default=0)
    llm_tokens_used = Column(Integer, default=0)
    estimated_cost_usd = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="sessions")
    steps = relationship("AgentStep", back_populates="session", cascade="all, delete-orphan", order_by="AgentStep.order")
    search_results = relationship("SearchResult", back_populates="session", cascade="all, delete-orphan")


class AgentStep(Base):
    __tablename__ = "agent_steps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    step_type = Column(String(50), nullable=False)
    step_label = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    content = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    order = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("ResearchSession", back_populates="steps")


class SearchResult(Base):
    __tablename__ = "search_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(Text, nullable=False)
    title = Column(Text, nullable=True)
    snippet = Column(Text, nullable=True)
    host_name = Column(String(255), nullable=True)
    full_content = Column(Text, nullable=True)
    quality_score = Column(Float, default=0.0)
    search_query = Column(Text, nullable=True)
    scraped = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("ResearchSession", back_populates="search_results")
