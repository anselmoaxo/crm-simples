from datetime import datetime

from pydantic import BaseModel, Field


class PerfilResponse(BaseModel):
    id: str
    empresa_id: str
    nome: str
    email: str | None = None
    perfil: str
    ativo: bool
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None


class PerfilUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=255)
    perfil: str | None = Field(None, pattern="^(ADMIN|GERENTE|VENDEDOR)$")
    ativo: bool | None = None
