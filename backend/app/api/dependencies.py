from fastapi import Depends, Header
from supabase import Client

from app.core.exceptions import ForbiddenException, ProfileRequiredException, UnauthorizedException
from app.core.security import get_supabase_client
from app.repositories.perfil_repository import PerfilRepository


class UsuarioLogado:
    def __init__(self, usuario_id: str, email: str, perfil_id: str, empresa_id: str, perfil: str, nome: str):
        self.usuario_id = usuario_id
        self.email = email
        self.perfil_id = perfil_id
        self.empresa_id = empresa_id
        self.perfil = perfil
        self.nome = nome

    def is_admin(self) -> bool:
        return self.perfil == "ADMIN"

    def is_gerente(self) -> bool:
        return self.perfil in ("ADMIN", "GERENTE")

    def is_vendedor(self) -> bool:
        return True


class UsuarioAutenticado:
    def __init__(self, usuario_id: str, email: str):
        self.usuario_id = usuario_id
        self.email = email


def _get_token(authorization: str | None) -> str:
    if not authorization:
        raise UnauthorizedException("Token não fornecido.")
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Token inválido.")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise UnauthorizedException("Token inválido.")
    return token


async def get_supabase(authorization: str | None = Header(None)) -> Client:
    token = _get_token(authorization) if authorization else None
    return get_supabase_client(token)


def authenticate_token(supabase: Client, token: str) -> UsuarioAutenticado:
    try:
        response = supabase.auth.get_user(token)
    except Exception:
        raise UnauthorizedException("Token inválido ou expirado.") from None

    if not response or not response.user:
        raise UnauthorizedException("Token inválido ou expirado.")

    return UsuarioAutenticado(
        usuario_id=str(response.user.id),
        email=response.user.email or "",
    )


async def get_authenticated_user(
    authorization: str | None = Header(None),
    supabase: Client = Depends(get_supabase),
) -> UsuarioAutenticado:
    token = _get_token(authorization)
    return authenticate_token(supabase, token)


async def get_current_user(
    authenticated_user: UsuarioAutenticado = Depends(get_authenticated_user),
    supabase: Client = Depends(get_supabase),
) -> UsuarioLogado:
    perfil_repo = PerfilRepository(supabase)
    perfil_data = perfil_repo.get_by_usuario_id(authenticated_user.usuario_id)

    if not perfil_data:
        raise ProfileRequiredException()

    if not perfil_data.get("ativo", False):
        raise ForbiddenException("Usuário inativo.")

    return UsuarioLogado(
        usuario_id=authenticated_user.usuario_id,
        email=authenticated_user.email,
        perfil_id=perfil_data["id"],
        empresa_id=perfil_data["empresa_id"],
        perfil=perfil_data["perfil"],
        nome=perfil_data["nome"],
    )


def require_admin(user: UsuarioLogado = Depends(get_current_user)) -> UsuarioLogado:
    if not user.is_admin():
        raise ForbiddenException("Apenas administradores podem executar esta ação.")
    return user


def require_gerente(user: UsuarioLogado = Depends(get_current_user)) -> UsuarioLogado:
    if not user.is_gerente():
        raise ForbiddenException("Apenas gerentes e administradores podem executar esta ação.")
    return user
