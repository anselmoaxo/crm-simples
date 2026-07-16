from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.api.dependencies import UsuarioLogado, get_current_user, get_supabase
from app.repositories.atividade_repository import AtividadeRepository
from app.schemas.dashboard import (
    AtividadePendente,
    DesempenhoVendedor,
    FunilEtapa,
    OrigemCliente,
    Resumo,
    VendasPeriodo,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/resumo", response_model=Resumo)
async def resumo(
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    eid = user.empresa_id

    total_clientes = _count(supabase, "clientes", eid)
    oportunidades_abertas = _count_oportunidades(supabase, eid, situacao="aberta")
    oportunidades_ganhas = _count_oportunidades(supabase, eid, situacao="ganha")
    oportunidades_perdidas = _count_oportunidades(supabase, eid, situacao="perdida")

    valor_negociacao = _sum_valor(supabase, eid, situacao="aberta")
    valor_ganho = _sum_valor(supabase, eid, situacao="ganha")

    total_oportunidades = oportunidades_ganhas + oportunidades_perdidas
    taxa = 0.0
    if total_oportunidades > 0:
        taxa = round(oportunidades_ganhas / total_oportunidades * 100, 2)

    inicio_hoje, fim_hoje = AtividadeRepository._day_bounds(date.today())
    atividades_vencidas = _count_atividades_vencidas(supabase, eid)
    atividades_hoje = _count(
        supabase,
        "atividades",
        eid,
        extra_gte={"data_agendada": inicio_hoje},
        extra_lt={"data_agendada": fim_hoje},
    )
    proximas = _count(
        supabase,
        "atividades",
        eid,
        extra_is={"concluida_em": "null"},
        extra_gte={"data_agendada": fim_hoje},
    )

    return Resumo(
        total_clientes=total_clientes,
        oportunidades_abertas=oportunidades_abertas,
        oportunidades_ganhas=oportunidades_ganhas,
        oportunidades_perdidas=oportunidades_perdidas,
        valor_em_negociacao=valor_negociacao,
        valor_ganho_periodo=valor_ganho,
        taxa_conversao=taxa,
        atividades_vencidas=atividades_vencidas,
        atividades_hoje=atividades_hoje,
        proximas_atividades=proximas,
    )


@router.get("/funil", response_model=list[FunilEtapa])
async def funil(
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    eid = user.empresa_id
    etapas = supabase.table("etapas_funil").select("*").eq("empresa_id", eid).order("ordem").execute()
    resultado = []
    for etapa in etapas.data or []:
        ops = (
            supabase.table("oportunidades")
            .select("valor", count="exact")
            .eq("empresa_id", eid)
            .eq("etapa_id", etapa["id"])
            .is_("ganho_em", "null")
            .is_("perdido_em", "null")
            .execute()
        )
        qtd = ops.count if hasattr(ops, "count") else len(ops.data or [])
        valor_total = sum(float(o.get("valor", 0)) for o in (ops.data or []))
        resultado.append(
            FunilEtapa(
                etapa_id=etapa["id"],
                etapa_nome=etapa["nome"],
                etapa_cor=etapa.get("cor"),
                quantidade=qtd,
                valor_total=valor_total,
            )
        )
    return resultado


@router.get("/vendas-por-periodo", response_model=list[VendasPeriodo])
async def vendas_por_periodo(
    dias: int = Query(30, ge=1, le=365),
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    eid = user.empresa_id
    data_limite = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()

    ops = (
        supabase.table("oportunidades")
        .select("valor, ganho_em")
        .eq("empresa_id", eid)
        .not_.is_("ganho_em", "null")
        .gte("ganho_em", data_limite)
        .execute()
    )

    periodos: dict[str, list[float]] = {}
    for op in ops.data or []:
        data = op.get("ganho_em", "")[:7]
        if data not in periodos:
            periodos[data] = []
        periodos[data].append(float(op.get("valor", 0)))

    resultado = [
        VendasPeriodo(
            periodo=periodo,
            quantidade=len(valores),
            valor_total=sum(valores),
        )
        for periodo, valores in sorted(periodos.items())
    ]
    return resultado


@router.get("/atividades-pendentes", response_model=list[AtividadePendente])
async def atividades_pendentes(
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    eid = user.empresa_id
    inicio_hoje, _ = AtividadeRepository._day_bounds(date.today())
    result = (
        supabase.table("atividades")
        .select("*")
        .eq("empresa_id", eid)
        .is_("concluida_em", "null")
        .order("data_agendada")
        .limit(20)
        .execute()
    )
    pendentes = []
    for atv in result.data or []:
        data_prevista, hora_prevista = AtividadeRepository._split_schedule(atv.get("data_agendada"))
        pendentes.append(
            AtividadePendente(
                id=atv["id"],
                tipo=atv["tipo"],
                titulo=atv["titulo"],
                cliente_nome=atv.get("cliente_nome"),
                data_prevista=data_prevista,
                hora_prevista=hora_prevista,
                responsavel_nome=atv.get("responsavel_nome"),
                em_atraso=bool(atv.get("data_agendada") and atv["data_agendada"] < inicio_hoje),
            )
        )
    return pendentes


@router.get("/desempenho-vendedores", response_model=list[DesempenhoVendedor])
async def desempenho_vendedores(
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    eid = user.empresa_id
    perfis = (
        supabase.table("perfis")
        .select("id, nome")
        .eq("empresa_id", eid)
        .in_("perfil", ["VENDEDOR", "GERENTE"])
        .execute()
    )
    resultado = []
    for perfil in perfis.data or []:
        uid = perfil["id"]
        abertas = _count_oportunidades(supabase, eid, responsavel_id=uid, situacao="aberta")
        ganhas = _count_oportunidades(supabase, eid, responsavel_id=uid, situacao="ganha")
        valor = _sum_valor(supabase, eid, responsavel_id=uid, situacao="ganha")
        pendentes = _count(
            supabase,
            "atividades",
            eid,
            extra_eq={"usuario_id": uid},
            extra_is={"concluida_em": "null"},
        )
        resultado.append(
            DesempenhoVendedor(
                usuario_id=uid,
                usuario_nome=perfil["nome"],
                oportunidades_abertas=abertas,
                oportunidades_ganhas=ganhas,
                valor_ganho=valor,
                atividades_pendentes=pendentes,
            )
        )
    return resultado


@router.get("/origem-clientes", response_model=list[OrigemCliente])
async def origem_clientes(
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    eid = user.empresa_id
    result = supabase.table("clientes").select("origem").eq("empresa_id", eid).execute()
    contagem: dict[str, int] = {}
    for cli in result.data or []:
        origem = cli.get("origem") or "Sem origem"
        contagem[origem] = contagem.get(origem, 0) + 1
    return [
        OrigemCliente(origem=origem, quantidade=qtd) for origem, qtd in sorted(contagem.items(), key=lambda x: -x[1])
    ]


def _count(
    supabase: Client,
    tabela: str,
    empresa_id: str,
    extra_eq: dict | None = None,
    extra_gt: dict | None = None,
    extra_gte: dict | None = None,
    extra_lt: dict | None = None,
    extra_is: dict | None = None,
) -> int:
    query = supabase.table(tabela).select("id", count="exact").eq("empresa_id", empresa_id)
    if extra_eq:
        for k, v in extra_eq.items():
            query = query.eq(k, v)
    if extra_gt:
        for k, v in extra_gt.items():
            query = query.gt(k, v)
    if extra_gte:
        for k, v in extra_gte.items():
            query = query.gte(k, v)
    if extra_lt:
        for k, v in extra_lt.items():
            query = query.lt(k, v)
    if extra_is:
        for k, v in extra_is.items():
            query = query.is_(k, v)
    result = query.execute()
    return result.count if hasattr(result, "count") else len(result.data or [])


def _count_oportunidades(
    supabase: Client,
    empresa_id: str,
    situacao: str = "aberta",
    responsavel_id: str | None = None,
) -> int:
    query = supabase.table("oportunidades").select("id", count="exact").eq("empresa_id", empresa_id)
    if situacao == "aberta":
        query = query.is_("ganho_em", "null").is_("perdido_em", "null")
    elif situacao == "ganha":
        query = query.not_.is_("ganho_em", "null")
    elif situacao == "perdida":
        query = query.not_.is_("perdido_em", "null")
    if responsavel_id:
        query = query.eq("responsavel_id", responsavel_id)
    result = query.execute()
    return result.count if hasattr(result, "count") else len(result.data or [])


def _sum_valor(
    supabase: Client,
    empresa_id: str,
    situacao: str = "aberta",
    responsavel_id: str | None = None,
) -> float:
    query = supabase.table("oportunidades").select("valor").eq("empresa_id", empresa_id)
    if situacao == "aberta":
        query = query.is_("ganho_em", "null").is_("perdido_em", "null")
    elif situacao == "ganha":
        query = query.not_.is_("ganho_em", "null")
    elif situacao == "perdida":
        query = query.not_.is_("perdido_em", "null")
    if responsavel_id:
        query = query.eq("responsavel_id", responsavel_id)
    result = query.execute()
    return sum(float(o.get("valor", 0)) for o in (result.data or []))


def _count_atividades_vencidas(supabase: Client, empresa_id: str) -> int:
    hoje, _ = AtividadeRepository._day_bounds(date.today())
    result = (
        supabase.table("atividades")
        .select("id", count="exact")
        .eq("empresa_id", empresa_id)
        .is_("concluida_em", "null")
        .lt("data_agendada", hoje)
        .execute()
    )
    return result.count if hasattr(result, "count") else len(result.data or [])
