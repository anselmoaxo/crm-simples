from app.repositories.base import BaseRepository


class ContatoRepository(BaseRepository):
    def list_by_cliente(self, cliente_id: str, empresa_id: str) -> list[dict]:
        result = (
            self.supabase.table("contatos")
            .select("*")
            .eq("cliente_id", cliente_id)
            .eq("empresa_id", empresa_id)
            .order("criado_em")
            .execute()
        )
        return result.data or []

    def get_by_id(self, contato_id: str, empresa_id: str) -> dict | None:
        result = (
            self.supabase.table("contatos")
            .select("*")
            .eq("id", contato_id)
            .eq("empresa_id", empresa_id)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None

    def create(self, data: dict) -> dict:
        result = self.supabase.table("contatos").insert(data).execute()
        return result.data[0]

    def update(self, contato_id: str, empresa_id: str, data: dict) -> dict | None:
        result = (
            self.supabase.table("contatos").update(data).eq("id", contato_id).eq("empresa_id", empresa_id).execute()
        )
        return result.data[0] if result.data else None

    def delete(self, contato_id: str, empresa_id: str) -> None:
        self.supabase.table("contatos").delete().eq("id", contato_id).eq("empresa_id", empresa_id).execute()
