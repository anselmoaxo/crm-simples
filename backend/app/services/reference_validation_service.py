from supabase import Client

from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.contato_repository import ContatoRepository
from app.repositories.oportunidade_repository import OportunidadeRepository
from app.repositories.perfil_repository import PerfilRepository


class ReferenceValidationService:
    def __init__(self, supabase: Client, empresa_id: str):
        self.empresa_id = empresa_id
        self.perfis = PerfilRepository(supabase)
        self.clientes = ClienteRepository(supabase)
        self.contatos = ContatoRepository(supabase)
        self.oportunidades = OportunidadeRepository(supabase)

    def validate(self, data: dict, existente: dict | None = None) -> None:
        existente = existente or {}

        if "responsavel_id" in data and data["responsavel_id"] is not None:
            perfil = self.perfis.get_by_id(data["responsavel_id"], self.empresa_id)
            if not perfil or not perfil.get("ativo"):
                raise NotFoundException("Responsável")

        if (
            "cliente_id" in data
            and data["cliente_id"] is not None
            and not self.clientes.get_by_id(data["cliente_id"], self.empresa_id)
        ):
            raise NotFoundException("Cliente")

        cliente_id = data.get("cliente_id", existente.get("cliente_id"))
        cliente_changed = "cliente_id" in data and cliente_id != existente.get("cliente_id")

        contato_id = data.get("contato_id", existente.get("contato_id"))
        if contato_id is not None and ("contato_id" in data or cliente_changed):
            contato = self.contatos.get_by_id(contato_id, self.empresa_id)
            if not contato:
                raise NotFoundException("Contato")
            if cliente_id is not None and contato.get("cliente_id") != cliente_id:
                raise ValidationException("Contato não pertence ao cliente informado.")

        oportunidade_id = data.get("oportunidade_id", existente.get("oportunidade_id"))
        if oportunidade_id is not None and ("oportunidade_id" in data or cliente_changed):
            oportunidade = self.oportunidades.get_by_id(oportunidade_id, self.empresa_id)
            if not oportunidade:
                raise NotFoundException("Oportunidade")
            if cliente_id is not None and oportunidade.get("cliente_id") != cliente_id:
                raise ValidationException("Oportunidade não pertence ao cliente informado.")
