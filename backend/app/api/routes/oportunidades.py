import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.api.dependencies import UsuarioLogado, get_current_user, get_supabase
from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.funil_repository import EtapaRepository
from app.repositories.oportunidade_repository import OportunidadeRepository
from app.schemas.oportunidades import (
    MoverEtapa,
    OportunidadeCreate,
    OportunidadeListResponse,
    OportunidadeResponse,
    OportunidadeUpdate,
)
from app.services.reference_validation_service import ReferenceValidationService
from app.utils.validators import validar_uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oportunidades", tags=["Oportunidades"])

MAX_POR_PAGINA = 100


@router.get("", response_model=OportunidadeListResponse)
async def list_oportunidades(
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=MAX_POR_PAGINA),
    funil_id: str | None = Query(None),
    etapa_id: str | None = Query(None),
    cliente_id: str | None = Query(None),
    responsavel_id: str | None = Query(None),
    situacao: str | None = Query(None),
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = OportunidadeRepository(supabase)
    filtros = {}
    if funil_id:
        filtros["funil_id"] = funil_id
    if etapa_id:
        filtros["etapa_id"] = etapa_id
    if cliente_id:
        filtros["cliente_id"] = cliente_id
    if responsavel_id:
        filtros["responsavel_id"] = responsavel_id
    if situacao:
        filtros["situacao"] = situacao

    dados, total = repo.list(
        empresa_id=user.empresa_id,
        pagina=pagina,
        por_pagina=por_pagina,
        **filtros,
    )
    total_paginas = max(1, (total + por_pagina - 1) // por_pagina)

    oportunidades = [_enriquecer_oportunidade(o, supabase, user.empresa_id) for o in dados]

    return OportunidadeListResponse(
        data=oportunidades,
        total=total,
        pagina=pagina,
        por_pagina=por_pagina,
        total_paginas=total_paginas,
    )


@router.get("/{id}", response_model=OportunidadeResponse)
async def get_oportunidade(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Oportunidade")
    repo = OportunidadeRepository(supabase)
    oportunidade = repo.get_by_id(id, user.empresa_id)
    if not oportunidade:
        raise NotFoundException("Oportunidade")
    return _enriquecer_oportunidade(oportunidade, supabase, user.empresa_id)


@router.post("", response_model=OportunidadeResponse, status_code=201)
async def create_oportunidade(
    body: OportunidadeCreate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = OportunidadeRepository(supabase)
    data = body.model_dump(mode="json")
    data["empresa_id"] = user.empresa_id

    etapa = _validar_etapa_funil(data.get("etapa_id", ""), data.get("funil_id", ""), user.empresa_id, supabase)

    if not data.get("responsavel_id"):
        data["responsavel_id"] = user.perfil_id

    ReferenceValidationService(supabase, user.empresa_id).validate(data)
    _aplicar_transicao_etapa(data, etapa)

    oportunidade = repo.create(data)
    return _enriquecer_oportunidade(oportunidade, supabase, user.empresa_id)


@router.patch("/{id}", response_model=OportunidadeResponse)
async def update_oportunidade(
    id: str,
    body: OportunidadeUpdate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Oportunidade")
    repo = OportunidadeRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Oportunidade")

    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise ValidationException("Informe ao menos um campo para atualização.")

    etapa_id = data.get("etapa_id", existente["etapa_id"])
    funil_id = data.get("funil_id", existente["funil_id"])
    etapa = _validar_etapa_funil(etapa_id, funil_id, user.empresa_id, supabase)
    ReferenceValidationService(supabase, user.empresa_id).validate(data, existente)
    _aplicar_transicao_etapa(data, etapa, existente)

    oportunidade = repo.update(id, user.empresa_id, data)
    return _enriquecer_oportunidade(oportunidade, supabase, user.empresa_id)


@router.delete("/{id}")
async def delete_oportunidade(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Oportunidade")
    repo = OportunidadeRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Oportunidade")
    repo.delete(id, user.empresa_id)
    return {"mensagem": "Oportunidade excluída com sucesso."}


@router.patch("/{id}/etapa", response_model=OportunidadeResponse)
async def mover_etapa(
    id: str,
    body: MoverEtapa,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Oportunidade")
    repo = OportunidadeRepository(supabase)
    oportunidade = repo.get_by_id(id, user.empresa_id)
    if not oportunidade:
        raise NotFoundException("Oportunidade")

    etapa_repo = EtapaRepository(supabase)
    nova_etapa = etapa_repo.get_by_id(body.etapa_id, user.empresa_id)
    if not nova_etapa:
        raise NotFoundException("Etapa")

    if nova_etapa["funil_id"] != oportunidade["funil_id"]:
        raise ValidationException("Etapa não pertence ao mesmo funil da oportunidade.")

    data: dict = {"etapa_id": body.etapa_id, "motivo_perda": body.motivo_perda}
    _aplicar_transicao_etapa(data, nova_etapa, oportunidade)

    atualizada = repo.update(id, user.empresa_id, data)
    return _enriquecer_oportunidade(atualizada, supabase, user.empresa_id)


def _enriquecer_oportunidade(oportunidade: dict, supabase: Client, empresa_id: str) -> OportunidadeResponse:
    resp = dict(oportunidade)

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
        logger.debug("Falha ao buscar cliente da oportunidade %s", resp.get("id"))

    if resp.get("contato_id"):
        try:
            ct = (
                supabase.table("contatos")
                .select("nome")
                .eq("id", resp["contato_id"])
                .eq("empresa_id", empresa_id)
                .single()
                .execute()
            )
            if ct.data:
                resp["contato_nome"] = ct.data.get("nome")
        except Exception:
            logger.debug("Falha ao buscar contato da oportunidade %s", resp.get("id"))

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
            logger.debug("Falha ao buscar responsável da oportunidade %s", resp.get("id"))

    if resp.get("funil_id"):
        try:
            fn = (
                supabase.table("funis")
                .select("nome")
                .eq("id", resp["funil_id"])
                .eq("empresa_id", empresa_id)
                .single()
                .execute()
            )
            if fn.data:
                resp["funil_nome"] = fn.data.get("nome")
        except Exception:
            logger.debug("Falha ao buscar funil da oportunidade %s", resp.get("id"))

    if resp.get("etapa_id"):
        try:
            et = (
                supabase.table("etapas_funil")
                .select("nome, cor, tipo")
                .eq("id", resp["etapa_id"])
                .eq("empresa_id", empresa_id)
                .single()
                .execute()
            )
            if et.data:
                resp["etapa_nome"] = et.data.get("nome")
                resp["etapa_cor"] = et.data.get("cor")
                resp["etapa_tipo"] = et.data.get("tipo")
        except Exception:
            logger.debug("Falha ao buscar etapa da oportunidade %s", resp.get("id"))

    return OportunidadeResponse(**resp)


def _validar_etapa_funil(etapa_id: str, funil_id: str, empresa_id: str, supabase: Client) -> dict:
    etapa_repo = EtapaRepository(supabase)
    etapa = etapa_repo.get_by_id(etapa_id, empresa_id)
    if not etapa:
        raise NotFoundException("Etapa")
    if etapa["funil_id"] != funil_id:
        raise ValidationException("Etapa não pertence ao funil informado.")
    return etapa


def _aplicar_transicao_etapa(data: dict, etapa: dict, existente: dict | None = None) -> None:
    agora = datetime.now(timezone.utc).isoformat()
    mesma_etapa = existente and existente.get("etapa_id") == etapa["id"]

    if etapa["tipo"] == "GANHA":
        data["ganho_em"] = existente.get("ganho_em") if mesma_etapa and existente.get("ganho_em") else agora
        data["perdido_em"] = None
        data["motivo_perda"] = None
    elif etapa["tipo"] == "PERDIDA":
        motivo_perda = data.get("motivo_perda")
        if "motivo_perda" not in data and existente:
            motivo_perda = existente.get("motivo_perda")
        if not motivo_perda:
            raise ValidationException("Motivo da perda é obrigatório para oportunidades perdidas.")
        data["perdido_em"] = existente.get("perdido_em") if mesma_etapa and existente.get("perdido_em") else agora
        data["ganho_em"] = None
        data["motivo_perda"] = motivo_perda
    else:
        data["ganho_em"] = None
        data["perdido_em"] = None
        data["motivo_perda"] = None
