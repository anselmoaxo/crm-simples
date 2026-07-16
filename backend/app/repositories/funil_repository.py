from app.repositories.base import BaseRepository


class FunilRepository(BaseRepository):
    def list_by_empresa(self, empresa_id: str) -> list[dict]:
        result = self.supabase.table("funis").select("*").eq("empresa_id", empresa_id).order("criado_em").execute()
        return result.data or []

    def get_by_id(self, funil_id: str, empresa_id: str) -> dict | None:
        result = (
            self.supabase.table("funis")
            .select("*")
            .eq("id", funil_id)
            .eq("empresa_id", empresa_id)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None

    def create(self, data: dict) -> dict:
        result = self.supabase.table("funis").insert(data).execute()
        return result.data[0]

    def update(self, funil_id: str, empresa_id: str, data: dict) -> dict | None:
        result = self.supabase.table("funis").update(data).eq("id", funil_id).eq("empresa_id", empresa_id).execute()
        return result.data[0] if result.data else None

    def delete(self, funil_id: str, empresa_id: str) -> None:
        self.supabase.table("funis").delete().eq("id", funil_id).eq("empresa_id", empresa_id).execute()


class EtapaRepository(BaseRepository):
    def list_by_funil(self, funil_id: str, empresa_id: str) -> list[dict]:
        result = (
            self.supabase.table("etapas_funil")
            .select("*")
            .eq("funil_id", funil_id)
            .eq("empresa_id", empresa_id)
            .order("ordem")
            .execute()
        )
        return result.data or []

    def get_by_id(self, etapa_id: str, empresa_id: str) -> dict | None:
        result = (
            self.supabase.table("etapas_funil")
            .select("*")
            .eq("id", etapa_id)
            .eq("empresa_id", empresa_id)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None

    def create(self, data: dict) -> dict:
        result = self.supabase.table("etapas_funil").insert(data).execute()
        return result.data[0]

    def update(self, etapa_id: str, empresa_id: str, data: dict) -> dict | None:
        result = (
            self.supabase.table("etapas_funil").update(data).eq("id", etapa_id).eq("empresa_id", empresa_id).execute()
        )
        return result.data[0] if result.data else None

    def delete(self, etapa_id: str, empresa_id: str) -> None:
        self.supabase.table("etapas_funil").delete().eq("id", etapa_id).eq("empresa_id", empresa_id).execute()

    def get_ultima_ordem(self, funil_id: str, empresa_id: str) -> int:
        result = (
            self.supabase.table("etapas_funil")
            .select("ordem")
            .eq("funil_id", funil_id)
            .eq("empresa_id", empresa_id)
            .order("ordem", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]["ordem"]
        return -1

    def atualizar_ordem(self, etapa_id: str, empresa_id: str, ordem: int) -> None:
        self.supabase.table("etapas_funil").update({"ordem": ordem}).eq("id", etapa_id).eq(
            "empresa_id", empresa_id
        ).execute()

    def oportunidades_vinculadas(self, etapa_id: str, empresa_id: str) -> int:
        result = (
            self.supabase.table("oportunidades")
            .select("id", count="exact")
            .eq("etapa_id", etapa_id)
            .eq("empresa_id", empresa_id)
            .execute()
        )
        return result.count if hasattr(result, "count") else len(result.data or [])
