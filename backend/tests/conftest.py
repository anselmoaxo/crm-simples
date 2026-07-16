from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import (
    UsuarioAutenticado,
    UsuarioLogado,
    get_authenticated_user,
    get_current_user,
)
from app.core.config import settings

settings.supabase_url = "https://test.supabase.co"
settings.supabase_publishable_key = "test-key"
settings.supabase_service_role_key = "test-service-key"
settings.supabase_jwt_issuer = "https://test.supabase.co/auth/v1"

MOCK_USER = UsuarioLogado(
    usuario_id="user-123",
    email="admin@teste.com",
    perfil_id="perfil-123",
    empresa_id="empresa-123",
    perfil="ADMIN",
    nome="Admin Teste",
)

MOCK_VENDEDOR = UsuarioLogado(
    usuario_id="user-456",
    email="vendedor@teste.com",
    perfil_id="perfil-456",
    empresa_id="empresa-123",
    perfil="VENDEDOR",
    nome="Vendedor Teste",
)

MOCK_AUTH_USER = UsuarioAutenticado(
    usuario_id=MOCK_USER.usuario_id,
    email=MOCK_USER.email,
)


@pytest.fixture
def test_client():
    from app.main import app

    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    app.dependency_overrides[get_authenticated_user] = lambda: MOCK_AUTH_USER

    with ExitStack() as stack:
        stack.enter_context(patch("supabase._sync.client.create_client", return_value=MagicMock()))
        with TestClient(app) as client:
            yield client
    app.dependency_overrides.clear()


@pytest.fixture
def unauth_client():
    from app.main import app

    app.dependency_overrides.clear()

    with ExitStack() as stack:
        stack.enter_context(patch("supabase._sync.client.create_client", return_value=MagicMock()))
        with TestClient(app) as client:
            yield client
    app.dependency_overrides.clear()


@pytest.fixture
def vendedor_client():
    from app.main import app

    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_user] = lambda: MOCK_VENDEDOR

    with ExitStack() as stack:
        stack.enter_context(patch("supabase._sync.client.create_client", return_value=MagicMock()))
        with TestClient(app) as client:
            yield client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_current_user():
    return MOCK_USER


@pytest.fixture
def mock_vendedor_user():
    return MOCK_VENDEDOR
