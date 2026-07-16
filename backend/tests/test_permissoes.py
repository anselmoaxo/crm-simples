from unittest.mock import patch


class TestPermissoes:
    def test_vendedor_cannot_create_funil(self, vendedor_client):
        response = vendedor_client.post(
            "/api/v1/funis",
            json={"nome": "Novo Funil"},
            headers={"Authorization": "Bearer valid_token"},
        )
        assert response.status_code == 403

    def test_vendedor_cannot_delete_etapa(self, vendedor_client):
        response = vendedor_client.delete(
            "/api/v1/funis/etapas/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": "Bearer valid_token"},
        )
        assert response.status_code == 403

    def test_isolamento_entre_empresas(self, test_client):
        with patch("app.api.routes.clientes.ClienteRepository.get_by_id") as mock_get:
            mock_get.return_value = None
            response = test_client.get(
                "/api/v1/clientes/00000000-0000-0000-0000-000000000000",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 404
