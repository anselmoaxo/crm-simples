from datetime import datetime

from pydantic import BaseModel, Field


class ContatoCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    cargo: str | None = Field(None, max_length=100)
    email: str | None = None
    telefone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)


class ContatoUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=255)
    cargo: str | None = Field(None, max_length=100)
    email: str | None = None
    telefone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)


class ContatoResponse(BaseModel):
    id: str
    cliente_id: str
    empresa_id: str
    nome: str
    cargo: str | None = None
    email: str | None = None
    telefone: str | None = None
    whatsapp: str | None = None
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None
