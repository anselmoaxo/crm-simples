from unittest.mock import patch


class TestOportunidades:
    def test_list_oportunidades(self, test_client):
        with patch("app.api.routes.oportunidades.OportunidadeRepository.list") as mock:
            mock.return_value = ([], 0)
            response = test_client.get(
                "/api/v1/oportunidades",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200

    def test_create_oportunidade(self, test_client):
        with (
            patch("app.api.routes.oportunidades.EtapaRepository.get_by_id") as mock_etapa,
            patch("app.api.routes.oportunidades.ReferenceValidationService.validate"),
            patch("app.api.routes.oportunidades.OportunidadeRepository.create") as mock_create,
        ):
            mock_etapa.return_value = {
                "id": "etapa-1",
                "funil_id": "funil-1",
                "empresa_id": "empresa-123",
                "tipo": "ABERTA",
            }
            mock_create.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "cliente_id": "cliente-1",
                "funil_id": "funil-1",
                "etapa_id": "etapa-1",
                "titulo": "Oportunidade Teste",
                "valor": 1000.00,
            }
            response = test_client.post(
                "/api/v1/oportunidades",
                json={
                    "titulo": "Oportunidade Teste",
                    "cliente_id": "cliente-1",
                    "funil_id": "funil-1",
                    "etapa_id": "etapa-1",
                    "valor": 1000.00,
                },
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 201
            data = mock_create.call_args.args[0]
            assert data["responsavel_id"] == "perfil-123"
            assert data["ganho_em"] is None
            assert data["perdido_em"] is None

    def test_mover_etapa_para_perdida_sem_motivo(self, test_client):
        with (
            patch("app.api.routes.oportunidades.OportunidadeRepository.get_by_id") as mock_get,
            patch("app.api.routes.oportunidades.EtapaRepository.get_by_id") as mock_etapa,
        ):
            mock_get.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "cliente_id": "cliente-1",
                "funil_id": "funil-1",
                "etapa_id": "etapa-1",
                "titulo": "Oportunidade Teste",
                "valor": 1000.00,
            }
            mock_etapa.return_value = {
                "id": "etapa-perdida",
                "funil_id": "funil-1",
                "tipo": "PERDIDA",
            }
            response = test_client.patch(
                "/api/v1/oportunidades/00000000-0000-0000-0000-000000000000/etapa",
                json={"etapa_id": "etapa-perdida"},
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 422

    def test_mover_etapa_para_perdida_com_motivo(self, test_client):
        with (
            patch("app.api.routes.oportunidades.OportunidadeRepository.get_by_id") as mock_get,
            patch("app.api.routes.oportunidades.EtapaRepository.get_by_id") as mock_etapa,
            patch("app.api.routes.oportunidades.OportunidadeRepository.update") as mock_upd,
        ):
            mock_get.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "cliente_id": "cliente-1",
                "funil_id": "funil-1",
                "etapa_id": "etapa-1",
                "titulo": "Oportunidade Teste",
                "valor": 1000.00,
            }
            mock_etapa.return_value = {
                "id": "etapa-perdida",
                "funil_id": "funil-1",
                "tipo": "PERDIDA",
            }
            mock_upd.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "cliente_id": "cliente-1",
                "funil_id": "funil-1",
                "etapa_id": "etapa-perdida",
                "titulo": "Oportunidade Teste",
                "valor": 1000.00,
                "motivo_perda": "Preço alto",
            }
            response = test_client.patch(
                "/api/v1/oportunidades/00000000-0000-0000-0000-000000000000/etapa",
                json={"etapa_id": "etapa-perdida", "motivo_perda": "Preço alto"},
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200
            mock_upd.assert_called_once()
            assert mock_upd.call_args.args[1] == "empresa-123"
            assert mock_upd.call_args.args[2]["perdido_em"] is not None

    def test_create_terminal_stage_applies_transition(self, test_client):
        with (
            patch("app.api.routes.oportunidades.EtapaRepository.get_by_id") as mock_etapa,
            patch("app.api.routes.oportunidades.ReferenceValidationService.validate"),
            patch("app.api.routes.oportunidades.OportunidadeRepository.create") as mock_create,
        ):
            mock_etapa.return_value = {
                "id": "etapa-ganha",
                "funil_id": "funil-1",
                "empresa_id": "empresa-123",
                "tipo": "GANHA",
            }
            mock_create.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "cliente_id": "cliente-1",
                "funil_id": "funil-1",
                "etapa_id": "etapa-ganha",
                "titulo": "Venda",
                "valor": 100,
                "ganho_em": "2026-07-15T00:00:00+00:00",
            }

            response = test_client.post(
                "/api/v1/oportunidades",
                json={
                    "titulo": "Venda",
                    "cliente_id": "cliente-1",
                    "funil_id": "funil-1",
                    "etapa_id": "etapa-ganha",
                    "valor": 100,
                },
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 201
            payload = mock_create.call_args.args[0]
            assert isinstance(payload["valor"], str)
            assert payload["ganho_em"] is not None
            assert payload["perdido_em"] is None

    def test_empty_patch_is_rejected(self, test_client):
        with patch("app.api.routes.oportunidades.OportunidadeRepository.get_by_id") as mock_get:
            mock_get.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "cliente_id": "cliente-1",
                "funil_id": "funil-1",
                "etapa_id": "etapa-1",
                "titulo": "Venda",
                "valor": 100,
            }
            response = test_client.patch(
                "/api/v1/oportunidades/00000000-0000-0000-0000-000000000000",
                json={},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 422
