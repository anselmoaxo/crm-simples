import logging

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.api.dependencies import UsuarioLogado, get_current_user, get_supabase
from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.atividade_repository import AtividadeRepository
from app.schemas.atividades import (
    AtividadeCreate,
    AtividadeListResponse,
    AtividadeResponse,
    AtividadeUpdate,
)
from app.services.reference_validation_service import ReferenceValidationService
from app.utils.validators import validar_uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/atividades", tags=["Atividades"])

MAX_POR_PAGINA = 100


@router.get("", response_model=AtividadeListResponse)
async def list_atividades(
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=MAX_POR_PAGINA),
    tipo: str | None = Query(None),
    responsavel_id: str | None = Query(None),
    cliente_id: str | None = Query(None),
    oportunidade_id: str | None = Query(None),
    data: str | None = Query(None),
    concluida: bool | None = Query(None),
    atrasada: bool | None = Query(None),
    hoje: bool | None = Query(None),
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = AtividadeRepository(supabase)
    filtros = {}
    if tipo:
        filtros["tipo"] = tipo
    if responsavel_id:
        filtros["responsavel_id"] = responsavel_id
    if cliente_id:
        filtros["cliente_id"] = cliente_id
    if oportunidade_id:
        filtros["oportunidade_id"] = oportunidade_id
    if data:
        filtros["data"] = data
    if concluida is not None:
        filtros["concluida"] = concluida
    if atrasada:
        filtros["atrasada"] = True
    if hoje:
        filtros["hoje"] = True

    dados, total = repo.list(
        empresa_id=user.empresa_id,
        pagina=pagina,
        por_pagina=por_pagina,
        **filtros,
    )
    total_paginas = max(1, (total + por_pagina - 1) // por_pagina)

    atividades = [_enriquecer_atividade(a, supabase, user.empresa_id) for a in dados]

    return AtividadeListResponse(
        data=atividades,
        total=total,
        pagina=pagina,
        por_pagina=por_pagina,
        total_paginas=total_paginas,
    )


@router.get("/{id}", response_model=AtividadeResponse)
async def get_atividade(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Atividade")
    repo = AtividadeRepository(supabase)
    atividade = repo.get_by_id(id, user.empresa_id)
    if not atividade:
        raise NotFoundException("Atividade")
    return _enriquecer_atividade(atividade, supabase, user.empresa_id)


@router.post("", response_model=AtividadeResponse, status_code=201)
async def create_atividade(
    body: AtividadeCreate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = AtividadeRepository(supabase)
    data = body.model_dump(mode="json")
    data["empresa_id"] = user.empresa_id
    if not data.get("responsavel_id"):
        data["responsavel_id"] = user.usuario_id
    ReferenceValidationService(supabase, user.empresa_id).validate(data)
    atividade = repo.create(data)
    return _enriquecer_atividade(atividade, supabase, user.empresa_id)


@router.patch("/{id}", response_model=AtividadeResponse)
async def update_atividade(
    id: str,
    body: AtividadeUpdate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Atividade")
    repo = AtividadeRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Atividade")
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise ValidationException("Informe ao menos um campo para atualização.")
    ReferenceValidationService(supabase, user.empresa_id).validate(data, existente)
    atividade = repo.update(id, user.empresa_id, data)
    return _enriquecer_atividade(atividade, supabase, user.empresa_id)


@router.delete("/{id}")
async def delete_atividade(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Atividade")
    repo = AtividadeRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Atividade")
    repo.delete(id, user.empresa_id)
    return {"mensagem": "Atividade excluída com sucesso."}


@router.patch("/{id}/concluir", response_model=AtividadeResponse)
async def concluir_atividade(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Atividade")
    repo = AtividadeRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Atividade")
    atividade = repo.update(id, user.empresa_id, {"concluida": True})
    return _enriquecer_atividade(atividade, supabase, user.empresa_id)


@router.patch("/{id}/reabrir", response_model=AtividadeResponse)
async def reabrir_atividade(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Atividade")
    repo = AtividadeRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Atividade")
    atividade = repo.update(id, user.empresa_id, {"concluida": False})
    return _enriquecer_atividade(atividade, supabase, user.empresa_id)


def _enriquecer_atividade(atividade: dict, supabase: Client, empresa_id: str) -> AtividadeResponse:
    resp = dict(atividade)

    if resp.get("cliente_id"):
        try:
            cli = (
                supabase.table("clientes")
                .select("nome")
                .eq("id", resp["cliente_id"])
                .eq("empresa_id", empresa_id)
                .single()
                .execute()
            )
            if cli.data:
                resp["cliente_nome"] = cli.data.get("nome")
        except Exception:
            logger.debug("Falha ao buscar cliente da atividade %s", resp.get("id"))

    if resp.get("oportunidade_id"):
        try:
            op = (
                supabase.table("oportunidades")
                .select("titulo")
                .eq("id", resp["oportunidade_id"])
                .eq("empresa_id", empresa_id)
                .single()
                .execute()
            )
            if op.data:
                resp["oportunidade_titulo"] = op.data.get("titulo")
        except Exception:
            logger.debug("Falha ao buscar oportunidade da atividade %s", resp.get("id"))

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
            logger.debug("Falha ao buscar responsável da atividade %s", resp.get("id"))

    return AtividadeResponse(**resp)
