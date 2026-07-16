from fastapi import APIRouter, Depends
from supabase import Client

from app.api.dependencies import UsuarioLogado, get_current_user, get_supabase, require_gerente
from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.repositories.perfil_repository import PerfilRepository
from app.schemas.perfis import PerfilResponse, PerfilUpdate

router = APIRouter(prefix="/perfis", tags=["Perfis"])


@router.get("", response_model=list[PerfilResponse])
async def list_perfis(
    user: UsuarioLogado = Depends(require_gerente),
    supabase: Client = Depends(get_supabase),
):
    repo = PerfilRepository(supabase)
    perfis = repo.list_by_empresa(user.empresa_id)
    return [PerfilResponse(**p) for p in perfis]


@router.get("/{id}", response_model=PerfilResponse)
async def get_perfil(
    id: str,
    user: UsuarioLogado = Depends(require_gerente),
    supabase: Client = Depends(get_supabase),
):
    repo = PerfilRepository(supabase)
    perfil = repo.get_by_id(id, user.empresa_id)
    if not perfil:
        raise NotFoundException("Perfil")
    return PerfilResponse(**perfil)


@router.patch("/{id}", response_model=PerfilResponse)
async def update_perfil(
    id: str,
    body: PerfilUpdate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = PerfilRepository(supabase)
    perfil = repo.get_by_id(id, user.empresa_id)
    if not perfil:
        raise NotFoundException("Perfil")

    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise ValidationException("Informe ao menos um campo para atualização.")

    if not user.is_admin():
        if user.perfil_id != id:
            raise ForbiddenException("Você só pode alterar seu próprio perfil.")
        if set(data) - {"nome"}:
            raise ForbiddenException("Você não pode alterar perfil ou status de acesso.")

    updated = repo.update(id, user.empresa_id, data)
    if not updated:
        raise NotFoundException("Perfil")
    return PerfilResponse(**updated)
