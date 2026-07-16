from app.repositories.base import BaseRepository


class EmpresaRepository(BaseRepository):
    def get_by_id(self, empresa_id: str) -> dict | None:
        result = self.supabase.table("empresas").select("*").eq("id", empresa_id).maybe_single().execute()
        return result.data if result and result.data else None

    def update(self, empresa_id: str, data: dict) -> dict | None:
        result = self.supabase.table("empresas").update(data).eq("id", empresa_id).execute()
        return result.data[0] if result.data else None
