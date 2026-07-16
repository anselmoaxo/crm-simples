from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.api.dependencies import UsuarioAutenticado
from app.services.auth_service import AuthService


class TestAuth:
    def test_health_endpoint(self, unauth_client):
        response = unauth_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "crm-simples-api"

    def test_me_without_token(self, unauth_client):
        response = unauth_client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_onboarding_without_token(self, unauth_client):
        response = unauth_client.post(
            "/api/v1/auth/onboarding",
            json={"nome_empresa": "Teste", "nome_usuario": "Teste"},
        )
        assert response.status_code == 401

    def test_onboarding_already_exists_is_idempotent(self, test_client):
        with patch("app.api.routes.auth.AuthService.executar_onboarding") as mock:
            mock.return_value = {
                "empresa_id": "empresa-123",
                "perfil_id": "user-123",
                "funil_id": "funil-123",
            }
            response = test_client.post(
                "/api/v1/auth/onboarding",
                json={"nome_empresa": "Teste", "nome_usuario": "Teste"},
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200
            assert response.json()["empresa_id"] == "empresa-123"

    def test_user_without_profile(self, unauth_client):
        with patch("app.api.dependencies.authenticate_token") as mock_auth:
            mock_auth.return_value = UsuarioAutenticado(
                usuario_id="user-sem-perfil",
                email="test@test.com",
            )
            with patch("app.api.dependencies.PerfilRepository.get_by_usuario_id") as mock_perfil:
                mock_perfil.return_value = None
                response = unauth_client.get(
                    "/api/v1/auth/me",
                    headers={"Authorization": "Bearer valid_token"},
                )
                assert response.status_code == 403
                assert response.json()["error"]["code"] == "PERFIL_NAO_CADASTRADO"


def test_onboarding_normalizes_uuid_rpc_response():
    supabase = MagicMock()
    supabase.rpc.return_value.execute.return_value = SimpleNamespace(data="empresa-123")
    service = AuthService(supabase)

    with (
        patch.object(
            service.perfil_repo,
            "get_by_usuario_id",
            side_effect=[None, {"id": "perfil-123", "empresa_id": "empresa-123"}],
        ),
        patch("app.services.auth_service.FunilRepository.list_by_empresa") as list_funis,
    ):
        list_funis.return_value = [{"id": "funil-123"}]
        result = service.executar_onboarding("user-123", "Empresa", "Usuário")

    assert result == {
        "empresa_id": "empresa-123",
        "perfil_id": "perfil-123",
        "funil_id": "funil-123",
    }


def test_onboarding_returns_existing_profile_without_calling_rpc():
    supabase = MagicMock()
    service = AuthService(supabase)

    with (
        patch.object(
            service.perfil_repo,
            "get_by_usuario_id",
            return_value={"id": "user-123", "empresa_id": "empresa-123"},
        ),
        patch("app.services.auth_service.FunilRepository.list_by_empresa", return_value=[]) as list_funis,
    ):
        result = service.executar_onboarding("user-123", "Empresa", "Usuário")

    assert result == {"empresa_id": "empresa-123", "perfil_id": "user-123", "funil_id": ""}
    supabase.rpc.assert_not_called()
    list_funis.assert_called_once_with("empresa-123")


def test_onboarding_recovers_profile_when_rpc_response_fails_after_commit():
    supabase = MagicMock()
    supabase.rpc.return_value.execute.side_effect = TimeoutError("response lost")
    service = AuthService(supabase)

    with (
        patch.object(
            service.perfil_repo,
            "get_by_usuario_id",
            side_effect=[None, {"id": "user-123", "empresa_id": "empresa-123"}],
        ),
        patch(
            "app.services.auth_service.FunilRepository.list_by_empresa",
            return_value=[{"id": "funil-123"}],
        ),
    ):
        result = service.executar_onboarding("user-123", "Empresa", "Usuário")

    assert result == {
        "empresa_id": "empresa-123",
        "perfil_id": "user-123",
        "funil_id": "funil-123",
    }


def test_onboarding_uses_auth_user_id_when_rpc_returns_only_company_uuid():
    supabase = MagicMock()
    supabase.rpc.return_value.execute.return_value = SimpleNamespace(data="empresa-123")
    service = AuthService(supabase)

    with (
        patch.object(service.perfil_repo, "get_by_usuario_id", side_effect=[None, None]),
        patch("app.services.auth_service.FunilRepository.list_by_empresa", return_value=[]),
    ):
        result = service.executar_onboarding("user-123", "Empresa", "Usuário")

    assert result == {"empresa_id": "empresa-123", "perfil_id": "user-123", "funil_id": ""}
