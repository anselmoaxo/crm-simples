from __future__ import annotations

from typing import Any

from app.repositories.base import BaseRepository


class ClienteRepository(BaseRepository):
    def list(
        self,
        empresa_id: str,
        pagina: int = 1,
        por_pagina: int = 20,
        **filtros: Any,
    ) -> tuple[list[dict], int]:
        query = self.supabase.table("clientes").select("*", count="exact").eq("empresa_id", empresa_id)

        if filtros.get("nome"):
            query = query.ilike("nome", f"%{filtros['nome']}%")
        if filtros.get("cpf_cnpj"):
            query = query.ilike("cpf_cnpj", f"%{filtros['cpf_cnpj']}%")
        if filtros.get("cidade"):
            query = query.ilike("cidade", f"%{filtros['cidade']}%")
        if filtros.get("uf"):
            query = query.eq("uf", filtros["uf"])
        if filtros.get("origem"):
            query = query.eq("origem", filtros["origem"])
        if filtros.get("responsavel_id"):
            query = query.eq("responsavel_id", filtros["responsavel_id"])
        if "ativo" in filtros:
            query = query.eq("ativo", filtros["ativo"])

        inicio = (pagina - 1) * por_pagina
        query = query.range(inicio, inicio + por_pagina - 1).order("criado_em", desc=True)

        result = query.execute()
        total = result.count if hasattr(result, "count") else len(result.data or [])
        return result.data or [], total

    def get_by_id(self, cliente_id: str, empresa_id: str) -> dict | None:
        result = (
            self.supabase.table("clientes")
            .select("*")
            .eq("id", cliente_id)
            .eq("empresa_id", empresa_id)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None

    def create(self, data: dict) -> dict:
        result = self.supabase.table("clientes").insert(data).execute()
        return result.data[0]

    def create_many(self, data: list[dict]) -> list[dict]:
        if not data:
            return []
        result = self.supabase.table("clientes").insert(data).execute()
        return result.data or []

    def existing_emails(self, empresa_id: str, emails: list[str]) -> set[str]:
        if not emails:
            return set()
        result = (
            self.supabase.table("clientes").select("email").eq("empresa_id", empresa_id).in_("email", emails).execute()
        )
        return {row["email"] for row in (result.data or []) if row.get("email")}

    def update(self, cliente_id: str, empresa_id: str, data: dict) -> dict | None:
        result = (
            self.supabase.table("clientes").update(data).eq("id", cliente_id).eq("empresa_id", empresa_id).execute()
        )
        return result.data[0] if result.data else None

    def delete(self, cliente_id: str, empresa_id: str) -> None:
        self.supabase.table("clientes").delete().eq("id", cliente_id).eq("empresa_id", empresa_id).execute()
