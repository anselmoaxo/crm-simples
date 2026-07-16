from fastapi import APIRouter, Depends
from supabase import Client

from app.api.dependencies import UsuarioLogado, get_current_user, get_supabase, require_admin
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.repositories.funil_repository import EtapaRepository, FunilRepository
from app.schemas.funis import (
    EtapaCreate,
    EtapaResponse,
    EtapaUpdate,
    FunilCreate,
    FunilResponse,
    FunilUpdate,
    ReordenarEtapas,
)
from app.utils.validators import validar_uuid

router = APIRouter(prefix="/funis", tags=["Funis"])


@router.get("", response_model=list[FunilResponse])
async def list_funis(
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = FunilRepository(supabase)
    funis = repo.list_by_empresa(user.empresa_id)
    return [FunilResponse(**f) for f in funis]


@router.get("/{id}", response_model=FunilResponse)
async def get_funil(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Funil")
    repo = FunilRepository(supabase)
    funil = repo.get_by_id(id, user.empresa_id)
    if not funil:
        raise NotFoundException("Funil")
    return FunilResponse(**funil)


@router.post("", response_model=FunilResponse, status_code=201)
async def create_funil(
    body: FunilCreate,
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    repo = FunilRepository(supabase)
    data = body.model_dump(mode="json")
    data["empresa_id"] = user.empresa_id
    funil = repo.create(data)
    return FunilResponse(**funil)


@router.patch("/{id}", response_model=FunilResponse)
async def update_funil(
    id: str,
    body: FunilUpdate,
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Funil")
    repo = FunilRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Funil")
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise ValidationException("Informe ao menos um campo para atualização.")
    funil = repo.update(id, user.empresa_id, data)
    return FunilResponse(**funil)


@router.delete("/{id}")
async def delete_funil(
    id: str,
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Funil")
    repo = FunilRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Funil")
    repo.delete(id, user.empresa_id)
    return {"mensagem": "Funil excluído com sucesso."}


@router.get("/{funil_id}/etapas", response_model=list[EtapaResponse])
async def list_etapas(
    funil_id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(funil_id):
        raise NotFoundException("Funil")
    _validar_funil(funil_id, user.empresa_id, supabase)
    repo = EtapaRepository(supabase)
    etapas = repo.list_by_funil(funil_id, user.empresa_id)
    return [EtapaResponse(**e) for e in etapas]


@router.post("/{funil_id}/etapas", response_model=EtapaResponse, status_code=201)
async def create_etapa(
    funil_id: str,
    body: EtapaCreate,
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(funil_id):
        raise NotFoundException("Funil")
    _validar_funil(funil_id, user.empresa_id, supabase)
    repo = EtapaRepository(supabase)
    data = body.model_dump(mode="json")
    data["funil_id"] = funil_id
    data["empresa_id"] = user.empresa_id
    if "ordem" not in data or data["ordem"] == 0:
        data["ordem"] = repo.get_ultima_ordem(funil_id, user.empresa_id) + 1
    etapa = repo.create(data)
    return EtapaResponse(**etapa)


@router.patch("/etapas/{id}", response_model=EtapaResponse)
async def update_etapa(
    id: str,
    body: EtapaUpdate,
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Etapa")
    repo = EtapaRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Etapa")
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise ValidationException("Informe ao menos um campo para atualização.")
    etapa = repo.update(id, user.empresa_id, data)
    return EtapaResponse(**etapa)


@router.delete("/etapas/{id}")
async def delete_etapa(
    id: str,
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Etapa")
    repo = EtapaRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Etapa")
    vinculadas = repo.oportunidades_vinculadas(id, user.empresa_id)
    if vinculadas > 0:
        raise ConflictException(
            f"Etapa possui {vinculadas} oportunidade(s) vinculada(s). Remova ou mova as oportunidades antes de excluir."
        )
    repo.delete(id, user.empresa_id)
    return {"mensagem": "Etapa excluída com sucesso."}


@router.patch("/{funil_id}/etapas/reordenar")
async def reordenar_etapas(
    funil_id: str,
    body: ReordenarEtapas,
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(funil_id):
        raise NotFoundException("Funil")
    _validar_funil(funil_id, user.empresa_id, supabase)
    repo = EtapaRepository(supabase)
    etapa_ids = body.etapas_ids
    if len(etapa_ids) != len(set(etapa_ids)):
        raise ValidationException("A lista de etapas não pode conter IDs duplicados.")

    etapas = repo.list_by_funil(funil_id, user.empresa_id)
    ids_validos = {etapa["id"] for etapa in etapas}
    if any(etapa_id not in ids_validos for etapa_id in etapa_ids):
        raise ValidationException("Todas as etapas devem pertencer ao funil informado.")

    for ordem, etapa_id in enumerate(etapa_ids):
        repo.atualizar_ordem(etapa_id, user.empresa_id, ordem)
    return {"mensagem": "Etapas reordenadas com sucesso."}


def _validar_funil(funil_id: str, empresa_id: str, supabase: Client) -> None:
    repo = FunilRepository(supabase)
    funil = repo.get_by_id(funil_id, empresa_id)
    if not funil:
        raise NotFoundException("Funil")
