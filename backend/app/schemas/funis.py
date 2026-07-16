from datetime import datetime

from pydantic import BaseModel, Field


class EtapaCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    ordem: int = Field(default=0, ge=0)
    cor: str | None = Field(None, max_length=7)
    probabilidade: int = Field(default=0, ge=0, le=100)
    tipo: str = Field(default="ABERTA", pattern="^(ABERTA|GANHA|PERDIDA)$")


class EtapaUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=255)
    cor: str | None = Field(None, max_length=7)
    probabilidade: int | None = Field(None, ge=0, le=100)
    tipo: str | None = Field(None, pattern="^(ABERTA|GANHA|PERDIDA)$")


class EtapaResponse(BaseModel):
    id: str
    funil_id: str
    empresa_id: str
    nome: str
    ordem: int
    cor: str | None = None
    probabilidade: int
    tipo: str
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None


class ReordenarEtapas(BaseModel):
    etapas_ids: list[str] = Field(min_length=1)


class FunilCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)


class FunilUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=255)
    ativo: bool | None = None


class FunilResponse(BaseModel):
    id: str
    empresa_id: str
    nome: str
    ativo: bool
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None
