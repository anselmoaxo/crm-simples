from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from app.repositories.base import BaseRepository


class AtividadeRepository(BaseRepository):
    _DIRECT_COLUMNS = {
        "id",
        "empresa_id",
        "cliente_id",
        "oportunidade_id",
        "tipo",
        "titulo",
        "descricao",
        "criado_em",
        "atualizado_em",
    }

    def list(
        self,
        empresa_id: str,
        pagina: int = 1,
        por_pagina: int = 20,
        **filtros: Any,
    ) -> tuple[list[dict], int]:
        query = self.supabase.table("atividades").select("*", count="exact").eq("empresa_id", empresa_id)

        if filtros.get("tipo"):
            query = query.eq("tipo", filtros["tipo"])
        if filtros.get("responsavel_id"):
            query = query.eq("usuario_id", filtros["responsavel_id"])
        if filtros.get("cliente_id"):
            query = query.eq("cliente_id", filtros["cliente_id"])
        if filtros.get("oportunidade_id"):
            query = query.eq("oportunidade_id", filtros["oportunidade_id"])
        if filtros.get("data"):
            inicio, fim = self._day_bounds(filtros["data"])
            query = query.gte("data_agendada", inicio).lt("data_agendada", fim)
        if filtros.get("concluida") is not None:
            if filtros["concluida"]:
                query = query.not_.is_("concluida_em", "null")
            else:
                query = query.is_("concluida_em", "null")
        if filtros.get("atrasada"):
            hoje, _ = self._day_bounds(date.today())
            query = query.lt("data_agendada", hoje).is_("concluida_em", "null")
        if filtros.get("hoje"):
            inicio, fim = self._day_bounds(date.today())
            query = query.gte("data_agendada", inicio).lt("data_agendada", fim)

        inicio = (pagina - 1) * por_pagina
        query = query.range(inicio, inicio + por_pagina - 1).order("criado_em", desc=True)

        result = query.execute()
        total = result.count if hasattr(result, "count") else len(result.data or [])
        return [self._to_api(row) for row in (result.data or [])], total

    def get_by_id(self, atividade_id: str, empresa_id: str) -> dict | None:
        result = (
            self.supabase.table("atividades")
            .select("*")
            .eq("id", atividade_id)
            .eq("empresa_id", empresa_id)
            .maybe_single()
            .execute()
        )
        return self._to_api(result.data) if result and result.data else None

    def create(self, data: dict) -> dict:
        result = self.supabase.table("atividades").insert(self._to_db(data)).execute()
        return self._to_api(result.data[0])

    def update(self, atividade_id: str, empresa_id: str, data: dict) -> dict | None:
        existing = None
        schedule_fields = {"data_prevista", "hora_prevista"}
        if schedule_fields & data.keys() and not schedule_fields <= data.keys():
            existing = self.get_by_id(atividade_id, empresa_id)

        result = (
            self.supabase.table("atividades")
            .update(self._to_db(data, existing))
            .eq("id", atividade_id)
            .eq("empresa_id", empresa_id)
            .execute()
        )
        return self._to_api(result.data[0]) if result.data else None

    def delete(self, atividade_id: str, empresa_id: str) -> None:
        self.supabase.table("atividades").delete().eq("id", atividade_id).eq("empresa_id", empresa_id).execute()

    @classmethod
    def _to_db(cls, data: dict, existing: dict | None = None) -> dict:
        result = {key: value for key, value in data.items() if key in cls._DIRECT_COLUMNS}

        if "responsavel_id" in data:
            result["usuario_id"] = data["responsavel_id"]

        schedule_fields = {"data_prevista", "hora_prevista"}
        if schedule_fields & data.keys():
            scheduled_date = data.get("data_prevista", (existing or {}).get("data_prevista"))
            scheduled_time = data.get("hora_prevista", (existing or {}).get("hora_prevista"))
            result["data_agendada"] = cls._combine_schedule(scheduled_date, scheduled_time)

        if "concluida" in data:
            result["concluida_em"] = (
                data.get("concluida_em") or datetime.now(timezone.utc).isoformat() if data["concluida"] else None
            )
        elif "concluida_em" in data:
            result["concluida_em"] = data["concluida_em"]

        return result

    @staticmethod
    def _to_api(row: dict) -> dict:
        result = dict(row)
        result["responsavel_id"] = result.pop("usuario_id", None)
        data_agendada = result.pop("data_agendada", None)
        result["data_prevista"], result["hora_prevista"] = AtividadeRepository._split_schedule(data_agendada)
        result["concluida"] = result.get("concluida_em") is not None
        return result

    @staticmethod
    def _combine_schedule(scheduled_date: Any, scheduled_time: Any) -> str | None:
        if scheduled_date in (None, ""):
            return None
        date_value = scheduled_date.isoformat() if isinstance(scheduled_date, date) else str(scheduled_date)[:10]
        if isinstance(scheduled_time, time):
            time_value = scheduled_time.isoformat()
        else:
            time_value = str(scheduled_time or "00:00:00").strip()
        if len(time_value) == 5:
            time_value += ":00"
        return f"{date_value}T{time_value}"

    @staticmethod
    def _split_schedule(value: Any) -> tuple[str | None, str | None]:
        if value in (None, ""):
            return None, None
        if isinstance(value, datetime):
            return value.date().isoformat(), value.time().replace(tzinfo=None).isoformat()
        text = str(value).replace(" ", "T")
        if "T" not in text:
            return text[:10], None
        time_value = text.split("T", 1)[1].removesuffix("Z").split("+", 1)[0]
        return text[:10], time_value[:8]

    @staticmethod
    def _day_bounds(value: date | str) -> tuple[str, str]:
        day = value if isinstance(value, date) else date.fromisoformat(str(value)[:10])
        return f"{day.isoformat()}T00:00:00", f"{(day + timedelta(days=1)).isoformat()}T00:00:00"
