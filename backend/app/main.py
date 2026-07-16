import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from app.api.routes import (
    atividades,
    auth,
    clientes,
    contatos,
    dashboard,
    empresas,
    funis,
    oportunidades,
    perfis,
)
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


app = FastAPI(
    title=settings.app_name,
    openapi_url=f"{settings.api_prefix}/openapi.json" if settings.debug else None,
    docs_url=f"{settings.api_prefix}/docs" if settings.debug else None,
    redoc_url=None,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(_request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(APIError)
async def postgrest_exception_handler(_request: Request, exc: APIError):
    logger.exception("Erro retornado pelo Supabase/PostgREST")
    if exc.code == "42501":
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "SUPABASE_SEM_PERMISSAO",
                    "message": "O Supabase não concedeu as permissões necessárias para esta operação.",
                    "details": exc.message,
                }
            },
        )
    return JSONResponse(
        status_code=502,
        content={
            "error": {
                "code": "ERRO_SUPABASE",
                "message": "Não foi possível consultar o banco de dados.",
                "details": None,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(_request: Request, exc: Exception):
    logger.exception("Erro não tratado durante a requisição", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "ERRO_INTERNO", "message": "Erro interno do servidor.", "details": None}},
    )


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(empresas.router, prefix=settings.api_prefix)
app.include_router(perfis.router, prefix=settings.api_prefix)
app.include_router(clientes.router, prefix=settings.api_prefix)
app.include_router(contatos.router, prefix=settings.api_prefix)
app.include_router(funis.router, prefix=settings.api_prefix)
app.include_router(oportunidades.router, prefix=settings.api_prefix)
app.include_router(atividades.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "crm-simples-api"}
