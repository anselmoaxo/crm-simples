from app.repositories.base import BaseRepository


class PerfilRepository(BaseRepository):
    def get_by_usuario_id(self, usuario_id: str) -> dict | None:
        result = self.supabase.table("perfis").select("*").eq("id", usuario_id).maybe_single().execute()
        return result.data if result and result.data else None

    def get_by_id(self, perfil_id: str, empresa_id: str) -> dict | None:
        result = (
            self.supabase.table("perfis")
            .select("*")
            .eq("id", perfil_id)
            .eq("empresa_id", empresa_id)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None

    def list_by_empresa(self, empresa_id: str) -> list[dict]:
        result = self.supabase.table("perfis").select("*").eq("empresa_id", empresa_id).execute()
        return result.data or []

    def update(self, perfil_id: str, empresa_id: str, data: dict) -> dict | None:
        result = self.supabase.table("perfis").update(data).eq("id", perfil_id).eq("empresa_id", empresa_id).execute()
        return result.data[0] if result.data else None
