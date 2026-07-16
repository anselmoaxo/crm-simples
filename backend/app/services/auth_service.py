import logging

from supabase import Client

from app.core.exceptions import ForbiddenException
from app.repositories.funil_repository import FunilRepository
from app.repositories.perfil_repository import PerfilRepository

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.perfil_repo = PerfilRepository(supabase)

    def executar_onboarding(
        self,
        usuario_id: str,
        nome_empresa: str,
        nome_usuario: str,
    ) -> dict:
        perfil = self.perfil_repo.get_by_usuario_id(usuario_id)
        if perfil:
            return self._resultado_do_perfil(perfil)

        try:
            result = self.supabase.rpc(
                "criar_empresa_inicial",
                {
                    "nome_empresa": nome_empresa,
                    "nome_usuario": nome_usuario,
                },
            ).execute()
        except Exception:
            # A transação da RPC pode ter sido confirmada antes da resposta falhar.
            logger.warning("Falha na RPC criar_empresa_inicial; verificando se o perfil foi criado.", exc_info=True)
            perfil = self.perfil_repo.get_by_usuario_id(usuario_id)
            if perfil:
                return self._resultado_do_perfil(perfil)
            raise

        perfil = self.perfil_repo.get_by_usuario_id(usuario_id)
        if perfil:
            return self._resultado_do_perfil(perfil)

        if isinstance(result.data, dict):
            return result.data

        if isinstance(result.data, str) and result.data:
            funis = FunilRepository(self.supabase).list_by_empresa(result.data)
            return {
                "empresa_id": result.data,
                "perfil_id": usuario_id,
                "funil_id": funis[0]["id"] if funis else "",
            }

        if not result.data:
            raise ForbiddenException("Erro ao criar empresa. Verifique os dados.")

        raise ForbiddenException("A empresa foi criada, mas o perfil não pôde ser carregado.")

    def _resultado_do_perfil(self, perfil: dict) -> dict:
        funis = FunilRepository(self.supabase).list_by_empresa(perfil["empresa_id"])
        return {
            "empresa_id": perfil["empresa_id"],
            "perfil_id": perfil["id"],
            "funil_id": funis[0]["id"] if funis else "",
        }
