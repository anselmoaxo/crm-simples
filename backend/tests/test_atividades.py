from unittest.mock import patch


class TestAtividades:
    def test_list_atividades(self, test_client):
        with patch("app.api.routes.atividades.AtividadeRepository.list") as mock:
            mock.return_value = ([], 0)
            response = test_client.get(
                "/api/v1/atividades",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200

    def test_create_atividade(self, test_client):
        with (
            patch("app.api.routes.atividades.ReferenceValidationService.validate"),
            patch("app.api.routes.atividades.AtividadeRepository.create") as mock_create,
        ):
            mock_create.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "tipo": "TAREFA",
                "titulo": "Tarefa Teste",
                "concluida": False,
            }
            response = test_client.post(
                "/api/v1/atividades",
                json={"tipo": "TAREFA", "titulo": "Tarefa Teste"},
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 201
            assert mock_create.call_args.args[0]["responsavel_id"] == "user-123"

    def test_concluir_atividade(self, test_client):
        with (
            patch("app.api.routes.atividades.AtividadeRepository.get_by_id") as mock_get,
            patch("app.api.routes.atividades.AtividadeRepository.update") as mock_upd,
        ):
            mock_get.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "titulo": "Teste",
                "tipo": "TAREFA",
                "concluida": False,
            }
            mock_upd.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "titulo": "Teste",
                "tipo": "TAREFA",
                "concluida": True,
            }
            response = test_client.patch(
                "/api/v1/atividades/00000000-0000-0000-0000-000000000000/concluir",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200
            assert mock_upd.call_args.args[1] == "empresa-123"

    def test_reabrir_atividade(self, test_client):
        with (
            patch("app.api.routes.atividades.AtividadeRepository.get_by_id") as mock_get,
            patch("app.api.routes.atividades.AtividadeRepository.update") as mock_upd,
        ):
            mock_get.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "titulo": "Teste",
                "tipo": "TAREFA",
                "concluida": True,
            }
            mock_upd.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "titulo": "Teste",
                "tipo": "TAREFA",
                "concluida": False,
            }
            response = test_client.patch(
                "/api/v1/atividades/00000000-0000-0000-0000-000000000000/reabrir",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200

    def test_delete_atividade_not_found(self, test_client):
        with patch("app.api.routes.atividades.AtividadeRepository.get_by_id") as mock_get:
            mock_get.return_value = None
            response = test_client.delete(
                "/api/v1/atividades/00000000-0000-0000-0000-000000000000",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 404
