from unittest.mock import patch

from app.api.dependencies import get_current_user
from tests.conftest import MOCK_USER, MOCK_VENDEDOR


class TestReordenarEtapas:
    funil_id = "00000000-0000-0000-0000-000000000001"

    def test_uses_frontend_contract_and_scopes_updates(self, test_client):
        with (
            patch("app.api.routes.funis.FunilRepository.get_by_id") as mock_funil,
            patch("app.api.routes.funis.EtapaRepository.list_by_funil") as mock_list,
            patch("app.api.routes.funis.EtapaRepository.atualizar_ordem") as mock_update,
        ):
            mock_funil.return_value = {"id": self.funil_id, "empresa_id": "empresa-123"}
            mock_list.return_value = [{"id": "etapa-1"}, {"id": "etapa-2"}]

            response = test_client.patch(
                f"/api/v1/funis/{self.funil_id}/etapas/reordenar",
                json={"etapas_ids": ["etapa-2", "etapa-1"]},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 200
            assert mock_update.call_args_list[0].args == ("etapa-2", "empresa-123", 0)
            assert mock_update.call_args_list[1].args == ("etapa-1", "empresa-123", 1)

    def test_rejects_duplicate_ids(self, test_client):
        with patch("app.api.routes.funis.FunilRepository.get_by_id") as mock_funil:
            mock_funil.return_value = {"id": self.funil_id, "empresa_id": "empresa-123"}
            response = test_client.patch(
                f"/api/v1/funis/{self.funil_id}/etapas/reordenar",
                json={"etapas_ids": ["etapa-1", "etapa-1"]},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 422

    def test_rejects_stage_from_another_funnel(self, test_client):
        with (
            patch("app.api.routes.funis.FunilRepository.get_by_id") as mock_funil,
            patch("app.api.routes.funis.EtapaRepository.list_by_funil") as mock_list,
        ):
            mock_funil.return_value = {"id": self.funil_id, "empresa_id": "empresa-123"}
            mock_list.return_value = [{"id": "etapa-1"}]
            response = test_client.patch(
                f"/api/v1/funis/{self.funil_id}/etapas/reordenar",
                json={"etapas_ids": ["etapa-outro-funil"]},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 422


class TestPerfilAuthorization:
    perfil = {
        "id": "perfil-456",
        "empresa_id": "empresa-123",
        "nome": "Vendedor",
        "perfil": "VENDEDOR",
        "ativo": True,
    }

    def test_admin_can_update_another_profile(self, test_client):
        with (
            patch("app.api.routes.perfis.PerfilRepository.get_by_id", return_value=self.perfil),
            patch(
                "app.api.routes.perfis.PerfilRepository.update",
                return_value={**self.perfil, "perfil": "GERENTE"},
            ) as mock,
        ):
            response = test_client.patch(
                "/api/v1/perfis/perfil-456",
                json={"perfil": "GERENTE"},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 200
            mock.assert_called_once_with("perfil-456", "empresa-123", {"perfil": "GERENTE"})

    def test_non_admin_cannot_update_another_profile(self, vendedor_client):
        with patch(
            "app.api.routes.perfis.PerfilRepository.get_by_id",
            return_value={**self.perfil, "id": "perfil-789"},
        ):
            response = vendedor_client.patch(
                "/api/v1/perfis/perfil-789",
                json={"nome": "Outro nome"},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 403

    def test_non_admin_can_update_own_safe_fields(self, test_client):
        from app.main import app

        app.dependency_overrides[get_current_user] = lambda: MOCK_VENDEDOR
        with (
            patch("app.api.routes.perfis.PerfilRepository.get_by_id", return_value=self.perfil),
            patch("app.api.routes.perfis.PerfilRepository.update", return_value={**self.perfil, "nome": "Novo Nome"}),
        ):
            response = test_client.patch(
                "/api/v1/perfis/perfil-456",
                json={"nome": "Novo Nome"},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 200

    def test_non_admin_cannot_update_own_role(self, test_client):
        from app.main import app

        app.dependency_overrides[get_current_user] = lambda: MOCK_VENDEDOR
        with patch("app.api.routes.perfis.PerfilRepository.get_by_id", return_value=self.perfil):
            response = test_client.patch(
                "/api/v1/perfis/perfil-456",
                json={"perfil": "ADMIN"},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 403


def test_dashboard_null_origin_is_grouped_as_sem_origem():
    from unittest.mock import MagicMock

    from app.api.routes.dashboard import origem_clientes

    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"origem": None},
        {},
        {"origem": "Site"},
    ]

    import asyncio

    result = asyncio.run(origem_clientes(MOCK_USER, supabase))

    assert [(item.origem, item.quantidade) for item in result] == [("Sem origem", 2), ("Site", 1)]
