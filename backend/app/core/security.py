from supabase import Client, ClientOptions, create_client

from app.core.config import settings


def get_supabase_client(access_token: str | None = None) -> Client:
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise RuntimeError("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no backend/.env.")

    headers = {"Authorization": f"Bearer {access_token}"} if access_token else {}
    return create_client(
        settings.supabase_url,
        settings.supabase_publishable_key,
        options=ClientOptions(
            headers=headers,
            auto_refresh_token=False,
            persist_session=False,
        ),
    )


def get_supabase_service_client() -> Client:
    if not settings.supabase_service_role_key:
        raise RuntimeError("Configure SUPABASE_SERVICE_ROLE_KEY no backend/.env.")
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
