from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table, DateTime
from sqlalchemy.orm import relationship
import datetime
from .database import Base

# Association table for Document <-> Skill (many-to-many)
document_skills = Table(
    "document_skills",
    Base.metadata,
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE")),
    Column("skill_id", Integer, ForeignKey("skills.id", ondelete="CASCADE"))
)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), index=True)
    file_path = Column(String(500), nullable=True)
    category = Column(String(50), default="Project")  # Project, Certificate, Internship, Resume, Achievement, Academic
    extracted_text = Column(Text, default="")
    summary = Column(Text, default="")
    year = Column(Integer, default=datetime.datetime.now().year)
    created_at = Column(DateTime, default=datetime.datetime.now)

    skills = relationship("Skill", secondary=document_skills, back_populates="documents")

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)

    documents = relationship("Document", secondary=document_skills, back_populates="skills")

class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String(50))  # "document" or "skill"
    source_id = Column(String(100))    # document ID or skill name
    target_type = Column(String(50))  # "document" or "skill"
    target_id = Column(String(100))    # document ID or skill name
    rel_type = Column(String(100))     # e.g., "acquired", "linked_to", "demonstrates"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True)
    password = Column(String(100))

