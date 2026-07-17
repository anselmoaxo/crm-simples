from __future__ import annotations

from typing import Any

from app.repositories.base import BaseRepository


class ClienteRepository(BaseRepository):
    _TIPO_PESSOA_TO_DB = {"FISICA": "F", "JURIDICA": "J"}
    _TIPO_PESSOA_TO_API = {value: key for key, value in _TIPO_PESSOA_TO_DB.items()}

    @classmethod
    def _to_db(cls, data: dict) -> dict:
        payload = data.copy()
        if payload.get("tipo_pessoa") in cls._TIPO_PESSOA_TO_DB:
            payload["tipo_pessoa"] = cls._TIPO_PESSOA_TO_DB[payload["tipo_pessoa"]]
        return payload

    @classmethod
    def _to_api(cls, row: dict) -> dict:
        result = row.copy()
        if result.get("tipo_pessoa") in cls._TIPO_PESSOA_TO_API:
            result["tipo_pessoa"] = cls._TIPO_PESSOA_TO_API[result["tipo_pessoa"]]
        return result

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
        return [self._to_api(row) for row in (result.data or [])], total

    def get_by_id(self, cliente_id: str, empresa_id: str) -> dict | None:
        result = (
            self.supabase.table("clientes")
            .select("*")
            .eq("id", cliente_id)
            .eq("empresa_id", empresa_id)
            .maybe_single()
            .execute()
        )
        return self._to_api(result.data) if result and result.data else None

    def create(self, data: dict) -> dict:
        result = self.supabase.table("clientes").insert(self._to_db(data)).execute()
        return self._to_api(result.data[0])

    def create_many(self, data: list[dict]) -> list[dict]:
        if not data:
            return []
        result = self.supabase.table("clientes").insert([self._to_db(row) for row in data]).execute()
        return [self._to_api(row) for row in (result.data or [])]

    def existing_emails(self, empresa_id: str, emails: list[str]) -> set[str]:
        if not emails:
            return set()
        result = (
            self.supabase.table("clientes").select("email").eq("empresa_id", empresa_id).in_("email", emails).execute()
        )
        return {row["email"] for row in (result.data or []) if row.get("email")}

    def update(self, cliente_id: str, empresa_id: str, data: dict) -> dict | None:
        result = (
            self.supabase.table("clientes")
            .update(self._to_db(data))
            .eq("id", cliente_id)
            .eq("empresa_id", empresa_id)
            .execute()
        )
        return self._to_api(result.data[0]) if result.data else None

    def delete(self, cliente_id: str, empresa_id: str) -> None:
        self.supabase.table("clientes").delete().eq("id", cliente_id).eq("empresa_id", empresa_id).execute()
