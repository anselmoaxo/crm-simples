from fastapi import APIRouter, Depends
from supabase import Client

from app.api.dependencies import UsuarioLogado, get_current_user, get_supabase
from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.contato_repository import ContatoRepository
from app.schemas.contatos import ContatoCreate, ContatoResponse, ContatoUpdate
from app.utils.validators import validar_uuid

router = APIRouter(tags=["Contatos"])


@router.get("/clientes/{cliente_id}/contatos", response_model=list[ContatoResponse])
async def list_contatos(
    cliente_id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(cliente_id):
        raise NotFoundException("Cliente")
    _validar_cliente(cliente_id, user.empresa_id, supabase)
    repo = ContatoRepository(supabase)
    contatos = repo.list_by_cliente(cliente_id, user.empresa_id)
    return [ContatoResponse(**c) for c in contatos]


@router.post("/clientes/{cliente_id}/contatos", response_model=ContatoResponse, status_code=201)
async def create_contato(
    cliente_id: str,
    body: ContatoCreate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(cliente_id):
        raise NotFoundException("Cliente")
    _validar_cliente(cliente_id, user.empresa_id, supabase)
    repo = ContatoRepository(supabase)
    data = body.model_dump(mode="json")
    data["cliente_id"] = cliente_id
    data["empresa_id"] = user.empresa_id
    contato = repo.create(data)
    return ContatoResponse(**contato)


@router.get("/contatos/{id}", response_model=ContatoResponse)
async def get_contato(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Contato")
    repo = ContatoRepository(supabase)
    contato = repo.get_by_id(id, user.empresa_id)
    if not contato:
        raise NotFoundException("Contato")
    return ContatoResponse(**contato)


@router.patch("/contatos/{id}", response_model=ContatoResponse)
async def update_contato(
    id: str,
    body: ContatoUpdate,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Contato")
    repo = ContatoRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Contato")
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise ValidationException("Informe ao menos um campo para atualização.")
    contato = repo.update(id, user.empresa_id, data)
    return ContatoResponse(**contato)


@router.delete("/contatos/{id}")
async def delete_contato(
    id: str,
    user: UsuarioLogado = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not validar_uuid(id):
        raise NotFoundException("Contato")
    repo = ContatoRepository(supabase)
    existente = repo.get_by_id(id, user.empresa_id)
    if not existente:
        raise NotFoundException("Contato")
    repo.delete(id, user.empresa_id)
    return {"mensagem": "Contato excluído com sucesso."}


def _validar_cliente(cliente_id: str, empresa_id: str, supabase: Client) -> None:
    repo = ClienteRepository(supabase)
    cliente = repo.get_by_id(cliente_id, empresa_id)
    if not cliente:
        raise NotFoundException("Cliente")
