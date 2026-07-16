from datetime import date, datetime

from pydantic import BaseModel, Field


class AtividadeCreate(BaseModel):
    tipo: str = Field(..., pattern="^(TAREFA|LIGACAO|REUNIAO|EMAIL|WHATSAPP|ANOTACAO)$")
    titulo: str = Field(..., min_length=2, max_length=255)
    descricao: str | None = None
    cliente_id: str | None = None
    oportunidade_id: str | None = None
    responsavel_id: str | None = None
    data_prevista: date | None = None
    hora_prevista: str | None = None


class AtividadeUpdate(BaseModel):
    tipo: str | None = Field(None, pattern="^(TAREFA|LIGACAO|REUNIAO|EMAIL|WHATSAPP|ANOTACAO)$")
    titulo: str | None = Field(None, min_length=2, max_length=255)
    descricao: str | None = None
    cliente_id: str | None = None
    oportunidade_id: str | None = None
    responsavel_id: str | None = None
    data_prevista: date | None = None
    hora_prevista: str | None = None


class AtividadeResponse(BaseModel):
    id: str
    empresa_id: str
    tipo: str
    titulo: str
    descricao: str | None = None
    cliente_id: str | None = None
    cliente_nome: str | None = None
    oportunidade_id: str | None = None
    oportunidade_titulo: str | None = None
    responsavel_id: str | None = None
    responsavel_nome: str | None = None
    data_prevista: date | None = None
    hora_prevista: str | None = None
    concluida: bool
    concluida_em: datetime | None = None
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None


class AtividadeListResponse(BaseModel):
    data: list[AtividadeResponse]
    total: int
    pagina: int
    por_pagina: int
    total_paginas: int
