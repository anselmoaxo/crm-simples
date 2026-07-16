from decimal import Decimal

from pydantic import BaseModel


class Resumo(BaseModel):
    total_clientes: int
    oportunidades_abertas: int
    oportunidades_ganhas: int
    oportunidades_perdidas: int
    valor_em_negociacao: Decimal
    valor_ganho_periodo: Decimal
    taxa_conversao: float
    atividades_vencidas: int
    atividades_hoje: int
    proximas_atividades: int


class FunilEtapa(BaseModel):
    etapa_id: str
    etapa_nome: str
    etapa_cor: str | None = None
    quantidade: int
    valor_total: Decimal


class VendasPeriodo(BaseModel):
    periodo: str
    quantidade: int
    valor_total: Decimal


class AtividadePendente(BaseModel):
    id: str
    tipo: str
    titulo: str
    cliente_nome: str | None = None
    data_prevista: str | None = None
    hora_prevista: str | None = None
    responsavel_nome: str | None = None
    em_atraso: bool


class DesempenhoVendedor(BaseModel):
    usuario_id: str
    usuario_nome: str
    oportunidades_abertas: int
    oportunidades_ganhas: int
    valor_ganho: Decimal
    atividades_pendentes: int


class OrigemCliente(BaseModel):
    origem: str
    quantidade: int
