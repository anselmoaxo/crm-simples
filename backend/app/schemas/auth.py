from pydantic import BaseModel, Field


class OnboardingRequest(BaseModel):
    nome_empresa: str = Field(..., min_length=2, max_length=255)
    nome_usuario: str = Field(..., min_length=2, max_length=255)


class OnboardingResponse(BaseModel):
    mensagem: str
    empresa_id: str
    perfil_id: str
    funil_id: str


class MeResponse(BaseModel):
    id: str
    email: str
    nome: str
    perfil: str
    empresa_id: str
    empresa_nome: str
    ativo: bool
