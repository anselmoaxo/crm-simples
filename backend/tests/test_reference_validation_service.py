from unittest.mock import MagicMock

import pytest

from app.core.exceptions import NotFoundException, ValidationException
from app.services.reference_validation_service import ReferenceValidationService


@pytest.fixture
def validator():
    service = ReferenceValidationService(MagicMock(), "empresa-123")
    service.perfis = MagicMock()
    service.clientes = MagicMock()
    service.contatos = MagicMock()
    service.oportunidades = MagicMock()
    return service


@pytest.mark.parametrize("perfil", [None, {"id": "perfil-2", "ativo": False}])
def test_rejects_inaccessible_or_inactive_responsavel(validator, perfil):
    validator.perfis.get_by_id.return_value = perfil

    with pytest.raises(NotFoundException):
        validator.validate({"responsavel_id": "perfil-2"})

    validator.perfis.get_by_id.assert_called_once_with("perfil-2", "empresa-123")


def test_rejects_cliente_from_another_empresa(validator):
    validator.clientes.get_by_id.return_value = None

    with pytest.raises(NotFoundException):
        validator.validate({"cliente_id": "cliente-outra-empresa"})

    validator.clientes.get_by_id.assert_called_once_with("cliente-outra-empresa", "empresa-123")


def test_rejects_contato_from_another_empresa(validator):
    validator.clientes.get_by_id.return_value = {"id": "cliente-1"}
    validator.contatos.get_by_id.return_value = None

    with pytest.raises(NotFoundException):
        validator.validate({"cliente_id": "cliente-1", "contato_id": "contato-outra-empresa"})

    validator.contatos.get_by_id.assert_called_once_with("contato-outra-empresa", "empresa-123")


def test_rejects_contato_from_another_cliente(validator):
    validator.clientes.get_by_id.return_value = {"id": "cliente-1"}
    validator.contatos.get_by_id.return_value = {"id": "contato-1", "cliente_id": "cliente-2"}

    with pytest.raises(ValidationException):
        validator.validate({"cliente_id": "cliente-1", "contato_id": "contato-1"})


def test_rejects_oportunidade_from_another_cliente(validator):
    validator.clientes.get_by_id.return_value = {"id": "cliente-1"}
    validator.oportunidades.get_by_id.return_value = {
        "id": "oportunidade-1",
        "cliente_id": "cliente-2",
    }

    with pytest.raises(ValidationException):
        validator.validate({"cliente_id": "cliente-1", "oportunidade_id": "oportunidade-1"})


def test_rejects_oportunidade_from_another_empresa(validator):
    validator.oportunidades.get_by_id.return_value = None

    with pytest.raises(NotFoundException):
        validator.validate({"oportunidade_id": "oportunidade-outra-empresa"})

    validator.oportunidades.get_by_id.assert_called_once_with("oportunidade-outra-empresa", "empresa-123")


def test_cliente_change_revalidates_existing_references(validator):
    validator.clientes.get_by_id.return_value = {"id": "cliente-2"}
    validator.contatos.get_by_id.return_value = {"id": "contato-1", "cliente_id": "cliente-2"}
    validator.oportunidades.get_by_id.return_value = {
        "id": "oportunidade-1",
        "cliente_id": "cliente-2",
    }

    validator.validate(
        {"cliente_id": "cliente-2"},
        {
            "cliente_id": "cliente-1",
            "contato_id": "contato-1",
            "oportunidade_id": "oportunidade-1",
        },
    )

    validator.contatos.get_by_id.assert_called_once_with("contato-1", "empresa-123")
    validator.oportunidades.get_by_id.assert_called_once_with("oportunidade-1", "empresa-123")


def test_explicit_null_clears_nullable_references_without_lookup(validator):
    validator.validate(
        {"responsavel_id": None, "cliente_id": None, "contato_id": None, "oportunidade_id": None},
        {
            "responsavel_id": "perfil-1",
            "cliente_id": "cliente-1",
            "contato_id": "contato-1",
            "oportunidade_id": "oportunidade-1",
        },
    )

    validator.perfis.get_by_id.assert_not_called()
    validator.clientes.get_by_id.assert_not_called()
    validator.contatos.get_by_id.assert_not_called()
    validator.oportunidades.get_by_id.assert_not_called()
