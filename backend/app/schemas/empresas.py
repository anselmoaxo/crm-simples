from datetime import datetime

from pydantic import BaseModel, Field


class EmpresaResponse(BaseModel):
    id: str
    nome: str
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None


class EmpresaUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=255)
