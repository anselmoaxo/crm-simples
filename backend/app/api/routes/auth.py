from fastapi import APIRouter, Depends
from supabase import Client

from app.api.dependencies import (
    UsuarioAutenticado,
    UsuarioLogado,
    get_authenticated_user,
    get_current_user,
    get_supabase,
)
from app.schemas.auth import (
    MeResponse,
    OnboardingRequest,
    OnboardingResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/onboarding", response_model=OnboardingResponse)
async def onboarding(
    body: OnboardingRequest,
    user: UsuarioAutenticado = Depends(get_authenticated_user),
    supabase: Client = Depends(get_supabase),
):
    service = AuthService(supabase)
    result = service.executar_onboarding(
        usuario_id=user.usuario_id,
        nome_empresa=body.nome_empresa,
        nome_usuario=body.nome_usuario,
    )
    return OnboardingResponse(
        mensagem="Empresa cadastrada com sucesso!",
        empresa_id=result.get("empresa_id", ""),
        perfil_id=result.get("perfil_id", ""),
        funil_id=result.get("funil_id", ""),
    )


@router.get("/me", response_model=MeResponse)
async def me(
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    from app.repositories.empresa_repository import EmpresaRepository

    empresa_repo = EmpresaRepository(supabase)

    empresa = empresa_repo.get_by_id(user.empresa_id)

    return MeResponse(
        id=user.perfil_id,
        email=user.email,
        nome=user.nome,
        perfil=user.perfil,
        empresa_id=user.empresa_id,
        empresa_nome=empresa["nome"] if empresa else "",
        ativo=True,
    )
