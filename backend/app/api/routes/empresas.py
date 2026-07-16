from fastapi import APIRouter, Depends
from supabase import Client

from app.api.dependencies import UsuarioLogado, get_current_user, get_supabase, require_admin
from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.empresa_repository import EmpresaRepository
from app.schemas.empresas import EmpresaResponse, EmpresaUpdate

router = APIRouter(prefix="/empresa", tags=["Empresa"])


@router.get("", response_model=EmpresaResponse)
async def get_empresa(
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    repo = EmpresaRepository(supabase)
    empresa = repo.get_by_id(user.empresa_id)
    if not empresa:
        raise NotFoundException("Empresa")
    return EmpresaResponse(**empresa)


@router.patch("", response_model=EmpresaResponse)
async def update_empresa(
    body: EmpresaUpdate,
    user: UsuarioLogado = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    repo = EmpresaRepository(supabase)
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise ValidationException("Informe ao menos um campo para atualização.")
    empresa = repo.update(user.empresa_id, data)
    if not empresa:
        raise NotFoundException("Empresa")
    return EmpresaResponse(**empresa)
