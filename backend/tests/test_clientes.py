from unittest.mock import patch


class TestClientes:
    def test_list_clientes(self, test_client):
        with patch("app.api.routes.clientes.ClienteRepository.list") as mock_list:
            mock_list.return_value = ([], 0)
            response = test_client.get(
                "/api/v1/clientes",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert "total" in data

    def test_list_clientes_with_filter(self, test_client):
        with patch("app.api.routes.clientes.ClienteRepository.list") as mock_list:
            mock_list.return_value = ([], 0)
            response = test_client.get(
                "/api/v1/clientes?nome=teste&uf=SP&ativo=true",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200

    def test_create_cliente(self, test_client):
        with (
            patch("app.api.routes.clientes.ReferenceValidationService.validate"),
            patch("app.api.routes.clientes.ClienteRepository.create") as mock_create,
        ):
            mock_create.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "tipo_pessoa": "FISICA",
                "nome": "Cliente Teste",
                "ativo": True,
            }
            response = test_client.post(
                "/api/v1/clientes",
                json={"nome": "Cliente Teste"},
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 201
            assert mock_create.call_args.args[0]["responsavel_id"] == "perfil-123"

    def test_create_cliente_validation(self, test_client):
        response = test_client.post(
            "/api/v1/clientes",
            json={"nome": ""},
            headers={"Authorization": "Bearer valid_token"},
        )
        assert response.status_code == 422

    def test_create_clientes_teste_without_duplicates(self, test_client):
        with (
            patch("app.api.routes.clientes.ClienteRepository.existing_emails") as mock_existing,
            patch("app.api.routes.clientes.ClienteRepository.create_many") as mock_create,
        ):
            mock_existing.return_value = {"ana.teste@example.com"}
            mock_create.side_effect = lambda clientes: clientes

            response = test_client.post(
                "/api/v1/clientes/dados-teste",
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 201
            assert response.json()["criados"] == 9
            assert response.json()["ignorados"] == 1
            assert all(
                cliente["empresa_id"] == "empresa-123" and cliente["responsavel_id"] == "perfil-123"
                for cliente in mock_create.call_args.args[0]
            )

    def test_create_clientes_teste_requires_admin(self, vendedor_client):
        response = vendedor_client.post(
            "/api/v1/clientes/dados-teste",
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 403

    def test_create_clientes_teste_only_in_debug(self, test_client):
        with patch("app.api.routes.clientes.settings.debug", False):
            response = test_client.post(
                "/api/v1/clientes/dados-teste",
                headers={"Authorization": "Bearer valid_token"},
            )

        assert response.status_code == 403

    def test_get_cliente_not_found(self, test_client):
        with patch("app.api.routes.clientes.ClienteRepository.get_by_id") as mock_get:
            mock_get.return_value = None
            response = test_client.get(
                "/api/v1/clientes/00000000-0000-0000-0000-000000000000",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 404

    def test_update_cliente(self, test_client):
        with (
            patch("app.api.routes.clientes.ClienteRepository.get_by_id") as mock_get,
            patch("app.api.routes.clientes.ClienteRepository.update") as mock_upd,
        ):
            mock_get.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "tipo_pessoa": "FISICA",
                "nome": "Antigo",
                "ativo": True,
            }
            mock_upd.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "tipo_pessoa": "FISICA",
                "nome": "Novo",
                "ativo": True,
            }
            response = test_client.patch(
                "/api/v1/clientes/00000000-0000-0000-0000-000000000000",
                json={"nome": "Novo"},
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200
            assert mock_upd.call_args.args[1] == "empresa-123"

    def test_delete_cliente(self, test_client):
        with (
            patch("app.api.routes.clientes.ClienteRepository.get_by_id") as mock_get,
            patch("app.api.routes.clientes.ClienteRepository.delete") as mock_del,
        ):
            mock_get.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "nome": "Teste",
                "ativo": True,
            }
            mock_del.return_value = None
            response = test_client.delete(
                "/api/v1/clientes/00000000-0000-0000-0000-000000000000",
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 200
            mock_del.assert_called_once_with("00000000-0000-0000-0000-000000000000", "empresa-123")

    def test_update_cliente_allows_explicit_null(self, test_client):
        with (
            patch("app.api.routes.clientes.ClienteRepository.get_by_id") as mock_get,
            patch("app.api.routes.clientes.ClienteRepository.update") as mock_upd,
        ):
            mock_get.return_value = {"id": "123", "empresa_id": "empresa-123"}
            mock_upd.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "tipo_pessoa": "FISICA",
                "nome": "Cliente",
                "ativo": True,
                "observacoes": None,
            }
            response = test_client.patch(
                "/api/v1/clientes/00000000-0000-0000-0000-000000000000",
                json={"observacoes": None},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 200
            assert mock_upd.call_args.args[2] == {"observacoes": None}

    def test_cpf_formatado_is_valid(self, test_client):
        with (
            patch("app.api.routes.clientes.ReferenceValidationService.validate"),
            patch("app.api.routes.clientes.ClienteRepository.create") as mock_create,
        ):
            mock_create.return_value = {
                "id": "123",
                "empresa_id": "empresa-123",
                "tipo_pessoa": "FISICA",
                "nome": "Cliente",
                "cpf_cnpj": "123.456.789-01",
                "ativo": True,
            }
            response = test_client.post(
                "/api/v1/clientes",
                json={"nome": "Cliente", "cpf_cnpj": "123.456.789-01"},
                headers={"Authorization": "Bearer valid_token"},
            )

            assert response.status_code == 201
