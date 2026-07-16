import logging

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.api.dependencies import UsuarioLogado, get_current_user, get_supabase, require_admin
from app.core.config import settings
from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.repositories.cliente_repository import ClienteRepository
from app.schemas.clientes import (
    ClienteCreate,
    ClienteListResponse,
    ClienteResponse,
    ClientesTesteResponse,
    ClienteUpdate,
)
from app.services.reference_validation_service import ReferenceValidationService
from app.utils.validators import validar_uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clientes", tags=["Clientes"])

MAX_POR_PAGINA = 100

CLIENTES_TESTE = [
    {
        "tipo_pessoa": "FISICA",
        "nome": "Ana Martins (Teste)",
        "email": "ana.teste@example.com",
        "telefone": "11987651001",
        "whatsapp": "11987651001",
        "cidade": "São Paulo",
        "uf": "SP",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "FISICA",
        "nome": "Bruno Oliveira (Teste)",
        "email": "bruno.teste@example.com",
        "telefone": "21987651002",
        "whatsapp": "21987651002",
        "cidade": "Rio de Janeiro",
        "uf": "RJ",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "JURIDICA",
        "nome": "Café Aurora Ltda. (Teste)",
        "nome_fantasia": "Café Aurora",
        "email": "contato.cafe.teste@example.com",
        "telefone": "3132651003",
        "cidade": "Belo Horizonte",
        "uf": "MG",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "FISICA",
        "nome": "Carla Santos (Teste)",
        "email": "carla.teste@example.com",
        "telefone": "41987651004",
        "whatsapp": "41987651004",
        "cidade": "Curitiba",
        "uf": "PR",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "JURIDICA",
        "nome": "Delta Tecnologia Ltda. (Teste)",
        "nome_fantasia": "Delta Tecnologia",
        "email": "delta.teste@example.com",
        "telefone": "5132651005",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "FISICA",
        "nome": "Diego Ferreira (Teste)",
        "email": "diego.teste@example.com",
        "telefone": "71987651006",
        "whatsapp": "71987651006",
        "cidade": "Salvador",
        "uf": "BA",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "JURIDICA",
        "nome": "Estúdio Horizonte Ltda. (Teste)",
        "nome_fantasia": "Estúdio Horizonte",
        "email": "horizonte.teste@example.com",
        "telefone": "8532651007",
        "cidade": "Fortaleza",
        "uf": "CE",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "FISICA",
        "nome": "Fernanda Lima (Teste)",
        "email": "fernanda.teste@example.com",
        "telefone": "81987651008",
        "whatsapp": "81987651008",
        "cidade": "Recife",
        "uf": "PE",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "JURIDICA",
        "nome": "Grupo Ipê Ltda. (Teste)",
        "nome_fantasia": "Grupo Ipê",
        "email": "ipe.teste@example.com",
        "telefone": "6232651009",
        "cidade": "Goiânia",
        "uf": "GO",
        "origem": "DADOS_TESTE",
        "ativo": True,
    },
    {
        "tipo_pessoa": "FISICA",
        "nome": "Gabriel Rocha (Teste)",
        "email": "gabriel.teste@example.com",
        "telefone": "61987651010",
        "whatsapp": "61987651010",
        "cidade": "Brasília",
        "uf": "DF",
        "origem": "DADOS_TESTE",
        "ativo": False,
    },
]


@router.get("", response_model=ClienteListResponse)
async def list_clientes(
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=MAX_POR_PAGINA),
    nome: str | None = Query(None),
    cpf_cnpj: str | None = Query(None),
    cidade: str | None = Query(None),
    uf: str | None = Query(None),
    origem: str | None = Query(None),
    responsavel_id: str | None = Query(None),
    ativo: bool | None = Query(None),
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = ClienteRepository(supabase)
    filtros = {}
    if nome:
        filtros["nome"] = nome
    if cpf_cnpj:
        filtros["cpf_cnpj"] = cpf_cnpj
    if cidade:
        filtros["cidade"] = cidade
    if uf:
        filtros["uf"] = uf
    if origem:
        filtros["origem"] = origem
    if responsavel_id:
        filtros["responsavel_id"] = responsavel_id
    if ativo is not None:
        filtros["ativo"] = ativo

    dados, total = repo.list(
        empresa_id=user.empresa_id,
        pagina=pagina,
        por_pagina=por_pagina,
        **filtros,
    )
    total_paginas = max(1, (total + por_pagina - 1) // por_pagina)

    clientes = [_enriquecer_cliente(c, supabase, user.empresa_id) for c in dados]

    return ClienteListResponse(
        data=clientes,
        total=total,
        pagina=pagina,
        por_pagina=por_pagina,
        total_paginas=total_paginas,
    )


@router.get("/{id}", response_model=ClienteResponse)
async def get_cliente(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Cliente")
    repo = ClienteRepository(supabase)
    cliente = repo.get_by_id(id, user.empresa_id)
    if not cliente:
        raise NotFoundException("Cliente")
    return _enriquecer_cliente(cliente, supabase, user.empresa_id)


@router.post("", response_model=ClienteResponse, status_code=201)
async def create_cliente(
    body: ClienteCreate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = ClienteRepository(supabase)
    data = body.model_dump(mode="json")
    data["empresa_id"] = user.empresa_id
    if not data.get("responsavel_id"):
        data["responsavel_id"] = user.perfil_id
    ReferenceValidationService(supabase, user.empresa_id).validate(data)
    cliente = repo.create(data)
    return _enriquecer_cliente(cliente, supabase, user.empresa_id)


@router.post("/dados-teste", response_model=ClientesTesteResponse, status_code=201)
async def create_clientes_teste(
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    if not settings.debug:
        raise ForbiddenException("Dados de teste só podem ser criados em ambiente de desenvolvimento.")

    repo = ClienteRepository(supabase)
    emails = [cliente["email"] for cliente in CLIENTES_TESTE]
    existentes = repo.existing_emails(user.empresa_id, emails)
    novos = [
        {
            **cliente,
            "empresa_id": user.empresa_id,
            "responsavel_id": user.perfil_id,
            "observacoes": "Registro fictício gerado para testes do CRM.",
        }
        for cliente in CLIENTES_TESTE
        if cliente["email"] not in existentes
    ]
    criados = repo.create_many(novos)
    return ClientesTesteResponse(
        mensagem="Dados de teste processados com sucesso.",
        criados=len(criados),
        ignorados=len(CLIENTES_TESTE) - len(novos),
    )


@router.patch("/{id}", response_model=ClienteResponse)
async def update_cliente(
    id: str,
    body: ClienteUpdate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Cliente")
    repo = ClienteRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Cliente")
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise ValidationException("Informe ao menos um campo para atualização.")
    ReferenceValidationService(supabase, user.empresa_id).validate(data, existente)
    cliente = repo.update(id, user.empresa_id, data)
    return _enriquecer_cliente(cliente, supabase, user.empresa_id)


@router.delete("/{id}")
async def delete_cliente(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Cliente")
    repo = ClienteRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Cliente")
    repo.delete(id, user.empresa_id)
    return {"mensagem": "Cliente excluído com sucesso."}


def _enriquecer_cliente(cliente: dict, supabase: Client, empresa_id: str) -> ClienteResponse:
    resp = dict(cliente)
    if resp.get("responsavel_id"):
        try:
            pr = (
                supabase.table("perfis")
                .select("nome")
                .eq("id", resp["responsavel_id"])
                .eq("empresa_id", empresa_id)
                .single()
                .execute()
            )
            if pr.data:
                resp["responsavel_nome"] = pr.data.get("nome")
        except Exception:
            logger.debug("Falha ao buscar nome do responsável do cliente %s", resp.get("id"))
    return ClienteResponse(**resp)
