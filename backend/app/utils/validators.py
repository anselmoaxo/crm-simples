import re
import uuid


def validar_uuid(valor: str) -> bool:
    try:
        uuid.UUID(valor)
        return True
    except (ValueError, AttributeError):
        return False


def validar_cpf(cpf: str) -> bool:
    return bool(re.match(r"^\d{11}$", cpf))


def validar_cnpj(cnpj: str) -> bool:
    return bool(re.match(r"^\d{14}$", cnpj))


def validar_uf(uf: str) -> bool:
    ufs = {
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
    }
    return uf in ufs


def validar_telefone(tel: str) -> bool:
    digits = re.sub(r"\D", "", tel)
    return len(digits) in (10, 11)


def sanitizar_cpf_cnpj(valor: str) -> str:
    return re.sub(r"\D", "", valor)
