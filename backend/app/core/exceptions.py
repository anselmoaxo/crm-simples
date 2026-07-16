from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: str | None = None,
    ):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "details": details,
                }
            },
        )


class NotFoundException(AppException):
    def __init__(self, entity: str):
        super().__init__(
            code=f"{entity.upper()}_NAO_ENCONTRADO",
            message=f"{entity.capitalize()} não encontrado.",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "Acesso negado."):
        super().__init__(
            code="ACESSO_NEGADO",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ProfileRequiredException(AppException):
    def __init__(self):
        super().__init__(
            code="PERFIL_NAO_CADASTRADO",
            message="Usuário sem perfil cadastrado. Complete o onboarding.",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Não autenticado."):
        super().__init__(
            code="NAO_AUTENTICADO",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ConflictException(AppException):
    def __init__(self, message: str):
        super().__init__(
            code="CONFLITO",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
        )


class ValidationException(AppException):
    def __init__(self, message: str):
        super().__init__(
            code="DADOS_INVALIDOS",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
