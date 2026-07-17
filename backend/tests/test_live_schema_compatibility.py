import asyncio
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from app.api.routes.dashboard import _count_atividades_vencidas, atividades_pendentes
from app.repositories.atividade_repository import AtividadeRepository
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.perfil_repository import PerfilRepository
from app.schemas.contatos import ContatoCreate, ContatoResponse
from app.schemas.funis import FunilCreate, FunilResponse
from app.schemas.perfis import PerfilResponse, PerfilUpdate


class QuerySpy:
    def __init__(self, data=None, count=None):
        self.response = SimpleNamespace(data=data or [], count=count)
        self.calls = []
        self.payload = None
        self._negated = False

    @property
    def not_(self):
        self._negated = True
        return self

    def __getattr__(self, name):
        def method(*args, **kwargs):
            if name in {"insert", "update"}:
                self.payload = args[0]
            call_name = f"not_{name}" if self._negated else name
            self._negated = False
            self.calls.append((call_name, args, kwargs))
            return self

        return method

    def execute(self):
        return self.response


class SupabaseSpy:
    def __init__(self, query):
        self.query = query
        self.tables = []

    def table(self, name):
        self.tables.append(name)
        return self.query


def test_profile_lookup_uses_auth_user_id_as_profile_id():
    query = QuerySpy(data={"id": "user-1"})

    result = PerfilRepository(SupabaseSpy(query)).get_by_usuario_id("user-1")

    assert result == {"id": "user-1"}
    assert ("eq", ("id", "user-1"), {}) in query.calls
    assert not any(call[1][0] == "usuario_id" for call in query.calls if call[0] == "eq")


def test_profile_lookup_handles_maybe_single_none_response():
    query = QuerySpy()
    query.execute = lambda: None

    assert PerfilRepository(SupabaseSpy(query)).get_by_usuario_id("user-without-profile") is None


def test_client_type_is_translated_between_api_and_database():
    query = QuerySpy(
        data=[
            {
                "id": "cliente-1",
                "empresa_id": "empresa-1",
                "tipo_pessoa": "F",
                "nome": "Cliente",
                "ativo": True,
            }
        ]
    )

    result = ClienteRepository(SupabaseSpy(query)).create(
        {
            "empresa_id": "empresa-1",
            "tipo_pessoa": "FISICA",
            "nome": "Cliente",
            "ativo": True,
        }
    )

    assert query.payload["tipo_pessoa"] == "F"
    assert result["tipo_pessoa"] == "FISICA"


def test_client_list_translates_legal_person_type_from_database():
    query = QuerySpy(data=[{"id": "cliente-1", "tipo_pessoa": "J"}], count=1)

    rows, total = ClienteRepository(SupabaseSpy(query)).list("empresa-1")

    assert total == 1
    assert rows[0]["tipo_pessoa"] == "JURIDICA"


def test_profile_contract_does_not_require_database_email_or_usuario_id():
    response = PerfilResponse(
        id="user-1",
        empresa_id="empresa-1",
        nome="Maria",
        perfil="VENDEDOR",
        ativo=True,
    )

    assert response.email is None
    assert "email" not in PerfilUpdate.model_fields
    assert "usuario_id" not in PerfilResponse.model_fields
    assert PerfilUpdate(email="ignored@example.com").model_dump(exclude_unset=True) == {}


def test_removed_contact_and_funnel_fields_are_not_in_contracts():
    assert "principal" not in ContatoCreate.model_fields
    assert "principal" not in ContatoResponse.model_fields
    assert "descricao" not in FunilCreate.model_fields
    assert "descricao" not in FunilResponse.model_fields


def test_auth_me_keeps_authenticated_email_without_profile_email(test_client):
    with (
        patch(
            "app.repositories.perfil_repository.PerfilRepository.get_by_usuario_id",
            return_value={
                "id": "user-123",
                "empresa_id": "empresa-123",
                "nome": "Admin Teste",
                "perfil": "ADMIN",
                "ativo": True,
            },
        ),
        patch(
            "app.repositories.empresa_repository.EmpresaRepository.get_by_id",
            return_value={"id": "empresa-123", "nome": "Empresa"},
        ),
    ):
        response = test_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer valid_token"},
        )

    assert response.status_code == 200
    assert response.json()["email"] == "admin@teste.com"


def test_activity_list_queries_physical_columns_and_maps_rows():
    query = QuerySpy(
        data=[
            {
                "id": "atividade-1",
                "empresa_id": "empresa-1",
                "usuario_id": "user-1",
                "data_agendada": "2026-07-15T14:30:00+00:00",
                "concluida_em": None,
                "tipo": "TAREFA",
                "titulo": "Retorno",
            }
        ],
        count=1,
    )

    rows, total = AtividadeRepository(SupabaseSpy(query)).list(
        "empresa-1",
        responsavel_id="user-1",
        data="2026-07-15",
        concluida=False,
    )

    assert total == 1
    assert rows[0]["responsavel_id"] == "user-1"
    assert rows[0]["data_prevista"] == date(2026, 7, 15).isoformat()
    assert rows[0]["hora_prevista"] == "14:30:00"
    assert rows[0]["concluida"] is False
    assert ("eq", ("usuario_id", "user-1"), {}) in query.calls
    assert ("gte", ("data_agendada", "2026-07-15T00:00:00"), {}) in query.calls
    assert ("lt", ("data_agendada", "2026-07-16T00:00:00"), {}) in query.calls
    assert ("is_", ("concluida_em", "null"), {}) in query.calls


def test_activity_completed_filter_uses_non_null_completion_timestamp():
    query = QuerySpy()

    AtividadeRepository(SupabaseSpy(query)).list("empresa-1", concluida=True)

    assert ("not_is_", ("concluida_em", "null"), {}) in query.calls


def test_activity_create_writes_only_physical_columns():
    query = QuerySpy(
        data=[
            {
                "id": "atividade-1",
                "empresa_id": "empresa-1",
                "usuario_id": "user-1",
                "data_agendada": "2026-07-15T09:45:00",
                "concluida_em": None,
                "tipo": "REUNIAO",
                "titulo": "Demo",
            }
        ]
    )

    result = AtividadeRepository(SupabaseSpy(query)).create(
        {
            "empresa_id": "empresa-1",
            "tipo": "REUNIAO",
            "titulo": "Demo",
            "responsavel_id": "user-1",
            "data_prevista": "2026-07-15",
            "hora_prevista": "09:45",
            "concluida": False,
        }
    )

    assert query.payload == {
        "empresa_id": "empresa-1",
        "tipo": "REUNIAO",
        "titulo": "Demo",
        "usuario_id": "user-1",
        "data_agendada": "2026-07-15T09:45:00",
        "concluida_em": None,
    }
    assert result["data_prevista"] == "2026-07-15"
    assert not {"responsavel_id", "data_prevista", "hora_prevista", "concluida"} & query.payload.keys()


def test_activity_partial_schedule_updates_preserve_other_component_and_clear_date():
    existing = {"data_prevista": "2026-07-15", "hora_prevista": "08:30:00"}

    assert AtividadeRepository._to_db({"hora_prevista": "16:20"}, existing) == {"data_agendada": "2026-07-15T16:20:00"}
    assert AtividadeRepository._to_db({"data_prevista": "2026-07-20"}, existing) == {
        "data_agendada": "2026-07-20T08:30:00"
    }
    assert AtividadeRepository._to_db({"data_prevista": None}, existing) == {"data_agendada": None}


def test_activity_completion_translation_sets_and_clears_timestamp():
    completed = AtividadeRepository._to_db({"concluida": True})
    reopened = AtividadeRepository._to_db({"concluida": False})

    assert completed["concluida_em"] is not None
    assert reopened == {"concluida_em": None}
    assert "concluida" not in completed


def test_dashboard_pending_activities_query_and_map_physical_schedule(mock_current_user):
    query = QuerySpy(
        data=[
            {
                "id": "atividade-1",
                "tipo": "LIGACAO",
                "titulo": "Retorno",
                "data_agendada": "2099-07-15T11:25:00+00:00",
                "concluida_em": None,
            }
        ]
    )

    result = asyncio.run(atividades_pendentes(mock_current_user, SupabaseSpy(query)))

    assert result[0].data_prevista == "2099-07-15"
    assert result[0].hora_prevista == "11:25:00"
    assert ("is_", ("concluida_em", "null"), {}) in query.calls
    assert ("order", ("data_agendada",), {}) in query.calls
    assert not any(call[1][0] in {"concluida", "data_prevista"} for call in query.calls if call[1])


def test_dashboard_overdue_count_uses_physical_activity_columns():
    query = QuerySpy(count=3)

    result = _count_atividades_vencidas(SupabaseSpy(query), "empresa-1")

    assert result == 3
    assert ("is_", ("concluida_em", "null"), {}) in query.calls
    assert any(call[0] == "lt" and call[1][0] == "data_agendada" for call in query.calls)
