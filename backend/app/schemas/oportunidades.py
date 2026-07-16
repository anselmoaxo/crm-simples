from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class OportunidadeCreate(BaseModel):
    titulo: str = Field(..., min_length=2, max_length=255)
    cliente_id: str
    contato_id: str | None = None
    responsavel_id: str | None = None
    funil_id: str
    etapa_id: str
    valor: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    previsao_fechamento: date | None = None
    motivo_perda: str | None = None
    observacoes: str | None = None

    @field_validator("valor")
    @classmethod
    def validate_valor(cls, v):
        if v < Decimal("0.00"):
            raise ValueError("Valor não pode ser negativo")
        return v


class OportunidadeUpdate(BaseModel):
    titulo: str | None = Field(None, min_length=2, max_length=255)
    cliente_id: str | None = None
    contato_id: str | None = None
    responsavel_id: str | None = None
    funil_id: str | None = None
    etapa_id: str | None = None
    valor: Decimal | None = Field(None, ge=Decimal("0.00"))
    previsao_fechamento: date | None = None
    motivo_perda: str | None = None
    observacoes: str | None = None


class MoverEtapa(BaseModel):
    etapa_id: str
    motivo_perda: str | None = None


class OportunidadeResponse(BaseModel):
    id: str
    empresa_id: str
    cliente_id: str
    cliente_nome: str | None = None
    contato_id: str | None = None
    contato_nome: str | None = None
    responsavel_id: str | None = None
    responsavel_nome: str | None = None
    funil_id: str
    funil_nome: str | None = None
    etapa_id: str
    etapa_nome: str | None = None
    etapa_cor: str | None = None
    etapa_tipo: str | None = None
    titulo: str
    valor: Decimal
    previsao_fechamento: date | None = None
    motivo_perda: str | None = None
    ganho_em: datetime | None = None
    perdido_em: datetime | None = None
    observacoes: str | None = None
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None


class OportunidadeListResponse(BaseModel):
    data: list[OportunidadeResponse]
    total: int
    pagina: int
    por_pagina: int
    total_paginas: int
