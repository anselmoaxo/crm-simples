from typing import Any

from app.repositories.base import BaseRepository


class OportunidadeRepository(BaseRepository):
    def list(
        self,
        empresa_id: str,
        pagina: int = 1,
        por_pagina: int = 20,
        **filtros: Any,
    ) -> tuple[list[dict], int]:
        query = self.supabase.table("oportunidades").select("*", count="exact").eq("empresa_id", empresa_id)

        if filtros.get("funil_id"):
            query = query.eq("funil_id", filtros["funil_id"])
        if filtros.get("etapa_id"):
            query = query.eq("etapa_id", filtros["etapa_id"])
        if filtros.get("cliente_id"):
            query = query.eq("cliente_id", filtros["cliente_id"])
        if filtros.get("responsavel_id"):
            query = query.eq("responsavel_id", filtros["responsavel_id"])
        if filtros.get("situacao") == "aberta":
            query = query.is_("ganho_em", "null").is_("perdido_em", "null")
        elif filtros.get("situacao") == "ganha":
            query = query.not_.is_("ganho_em", "null")
        elif filtros.get("situacao") == "perdida":
            query = query.not_.is_("perdido_em", "null")

        inicio = (pagina - 1) * por_pagina
        query = query.range(inicio, inicio + por_pagina - 1).order("criado_em", desc=True)

        result = query.execute()
        total = result.count if hasattr(result, "count") else len(result.data or [])
        return result.data or [], total

    def get_by_id(self, oportunidade_id: str, empresa_id: str) -> dict | None:
        result = (
            self.supabase.table("oportunidades")
            .select("*")
            .eq("id", oportunidade_id)
            .eq("empresa_id", empresa_id)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None

    def create(self, data: dict) -> dict:
        result = self.supabase.table("oportunidades").insert(data).execute()
        return result.data[0]

    def update(self, oportunidade_id: str, empresa_id: str, data: dict) -> dict | None:
        result = (
            self.supabase.table("oportunidades")
            .update(data)
            .eq("id", oportunidade_id)
            .eq("empresa_id", empresa_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def delete(self, oportunidade_id: str, empresa_id: str) -> None:
        self.supabase.table("oportunidades").delete().eq("id", oportunidade_id).eq("empresa_id", empresa_id).execute()
