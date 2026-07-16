import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ClienteCreate(BaseModel):
    tipo_pessoa: str = Field(default="FISICA", pattern="^(FISICA|JURIDICA)$")
    nome: str = Field(..., min_length=2, max_length=255)
    nome_fantasia: str | None = Field(None, max_length=255)
    cpf_cnpj: str | None = Field(None, max_length=20)
    email: str | None = None
    telefone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    cidade: str | None = Field(None, max_length=100)
    uf: str | None = Field(None, pattern="^[A-Z]{2}$")
    origem: str | None = Field(None, max_length=100)
    responsavel_id: str | None = None
    observacoes: str | None = None
    ativo: bool = True

    @field_validator("cpf_cnpj")
    @classmethod
    def validate_cpf_cnpj(cls, v):
        if v and len(re.sub(r"\D", "", v)) not in (11, 14):
            raise ValueError("CPF deve ter 11 dígitos ou CNPJ 14 dígitos")
        return v


class ClienteUpdate(BaseModel):
    tipo_pessoa: str | None = Field(None, pattern="^(FISICA|JURIDICA)$")
    nome: str | None = Field(None, min_length=2, max_length=255)
    nome_fantasia: str | None = Field(None, max_length=255)
    cpf_cnpj: str | None = Field(None, max_length=20)
    email: str | None = None
    telefone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    cidade: str | None = Field(None, max_length=100)
    uf: str | None = Field(None, pattern="^[A-Z]{2}$")
    origem: str | None = Field(None, max_length=100)
    responsavel_id: str | None = None
    observacoes: str | None = None
    ativo: bool | None = None


class ClienteResponse(BaseModel):
    id: str
    empresa_id: str
    tipo_pessoa: str
    nome: str
    nome_fantasia: str | None = None
    cpf_cnpj: str | None = None
    email: str | None = None
    telefone: str | None = None
    whatsapp: str | None = None
    cidade: str | None = None
    uf: str | None = None
    origem: str | None = None
    responsavel_id: str | None = None
    responsavel_nome: str | None = None
    observacoes: str | None = None
    ativo: bool
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None


class ClienteListResponse(BaseModel):
    data: list[ClienteResponse]
    total: int
    pagina: int
    por_pagina: int
    total_paginas: int


class ClientesTesteResponse(BaseModel):
    mensagem: str
    criados: int
    ignorados: int
