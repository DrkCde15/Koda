"""API Documentation using Swagger/OpenAPI.

Provides interactive API documentation at /api/docs using Flask-Swagger-UI.
"""
from flask import Blueprint, jsonify, current_app
from flask_swagger_ui import get_swaggerui_blueprint

docs_bp = Blueprint("docs", __name__)

# Swagger UI blueprint
SWAGGER_URL = "/api/docs"
API_URL = "/api/swagger.json"

swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
        "app_name": "Koda API",
        "docExpansion": "none",
        "deepLinking": True,
        "showExtensions": True,
        "showCommonExtensions": True,
    },
)

# OpenAPI/Swagger specification
SWAGGER_SPEC = {
    "openapi": "3.0.0",
    "info": {
        "title": "Koda API",
        "version": "1.0.0",
        "description": """
Koda API - Uma plataforma de produtividade moderna.

## Autenticação
Esta API usa JWT (JSON Web Tokens) para autenticação. Para acessar endpoints protegidos:

1. Faça login em `/api/auth/login` para obter um access token
2. Inclua o token no header de todas as requisições:
   ```
   Authorization: Bearer <seu_token_aqui>
   ```

## Padrão de Resposta
Todas as respostas seguem este formato:
```json
{
  "success": true|false,
  "message": "Mensagem descriptiva",
  "data": { ... }  // ou "errors": [...]
}
```
        """,
        "contact": {
            "name": "Koda Team",
            "email": "support@koda.app",
        },
        "license": {
            "name": "MIT",
            "url": "https://opensource.org/licenses/MIT",
        },
    },
    "servers": [
        {
            "url": "http://localhost:5000",
            "description": "Servidor de Desenvolvimento",
        },
        {
            "url": "https://api.koda.app",
            "description": "Servidor de Produção",
        },
    ],
    "components": {
        "securitySchemes": {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "JWT token obtido via /api/auth/login",
            }
        },
        "schemas": {
            "Error": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean", "example": False},
                    "message": {"type": "string"},
                    "errors": {"type": "array", "items": {"type": "string"}},
                },
            },
            "Success": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean", "example": True},
                    "message": {"type": "string"},
                    "data": {"type": "object"},
                },
            },
            "User": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "email": {"type": "string", "format": "email"},
                    "full_name": {"type": "string"},
                    "avatar_url": {"type": "string", "nullable": True},
                    "role": {"type": "string", "enum": ["admin", "user"]},
                },
            },
            "Workspace": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "name": {"type": "string"},
                    "slug": {"type": "string"},
                    "icon": {"type": "string", "nullable": True},
                    "owner_id": {"type": "integer"},
                    "created_at": {"type": "string", "format": "date-time"},
                },
            },
            "Page": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "workspace_id": {"type": "integer"},
                    "parent_id": {"type": "integer", "nullable": True},
                    "created_at": {"type": "string", "format": "date-time"},
                },
            },
            "Block": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "type": {"type": "string"},
                    "content": {"type": "string"},
                    "page_id": {"type": "integer"},
                    "order": {"type": "integer"},
                },
            },
        },
    },
    "security": [{"BearerAuth": []}],
    "tags": [
        {"name": "Authentication", "description": "Endpoints de autenticação"},
        {"name": "Users", "description": "Gerenciamento de usuários"},
        {"name": "Workspaces", "description": "Gerenciamento de workspaces"},
        {"name": "Pages", "description": "Gerenciamento de páginas"},
        {"name": "Blocks", "description": "Gerenciamento de blocos"},
        {"name": "Files", "description": "Upload e gerenciamento de arquivos"},
        {"name": "Search", "description": "Busca global"},
        {"name": "Databases", "description": "Bancos de dados internos"},
    ],
    "paths": {
        "/api/auth/login": {
            "post": {
                "tags": ["Authentication"],
                "summary": "Login de usuário",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["email", "password"],
                                "properties": {
                                    "email": {"type": "string", "format": "email"},
                                    "password": {"type": "string", "format": "password"},
                                },
                            }
                        }
                    },
                },
                "responses": {
                    "200": {
                        "description": "Login realizado com sucesso",
                        "content": {
                            "application/json": {
                                "example": {
                                    "success": True,
                                    "message": "Login successful",
                                    "data": {
                                        "access_token": "eyJ...",
                                        "refresh_token": "eyJ...",
                                        "user": {"id": 1, "email": "user@example.com"},
                                    },
                                }
                            }
                        },
                    },
                    "401": {
                        "description": "Credenciais inválidas",
                        "content": {"application/json": {"$ref": "#/components/schemas/Error"}},
                    },
                },
            }
        },
        "/api/auth/register": {
            "post": {
                "tags": ["Authentication"],
                "summary": "Registro de novo usuário",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["email", "password", "full_name"],
                                "properties": {
                                    "email": {"type": "string", "format": "email"},
                                    "password": {"type": "string", "minLength": 8},
                                    "full_name": {"type": "string"},
                                },
                            }
                        }
                    },
                },
                "responses": {
                    "201": {
                        "description": "Usuário criado com sucesso",
                        "content": {"application/json": {"$ref": "#/components/schemas/Success"}},
                    },
                    "400": {
                        "description": "Dados inválidos",
                        "content": {"application/json": {"$ref": "#/components/schemas/Error"}},
                    },
                },
            }
        },
        "/api/workspaces": {
            "get": {
                "tags": ["Workspaces"],
                "summary": "Listar workspaces do usuário",
                "security": [{"BearerAuth": []}],
                "responses": {
                    "200": {
                        "description": "Lista de workspaces",
                        "content": {
                            "application/json": {
                                "example": {
                                    "success": True,
                                    "data": [
                                        {
                                            "id": 1,
                                            "name": "Meu Workspace",
                                            "slug": "meu-workspace",
                                        }
                                    ],
                                }
                            }
                        },
                    },
                    "401": {"description": "Não autorizado"},
                },
            },
            "post": {
                "tags": ["Workspaces"],
                "summary": "Criar novo workspace",
                "security": [{"BearerAuth": []}],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["name"],
                                "properties": {
                                    "name": {"type": "string"},
                                    "icon": {"type": "string"},
                                },
                            }
                        }
                    },
                },
                "responses": {
                    "201": {
                        "description": "Workspace criado",
                        "content": {"application/json": {"$ref": "#/components/schemas/Workspace"}},
                    },
                },
            },
        },
        "/api/pages/{id}": {
            "get": {
                "tags": ["Pages"],
                "summary": "Obter detalhes de uma página",
                "security": [{"BearerAuth": []}],
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "integer"},
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Detalhes da página",
                        "content": {"application/json": {"$ref": "#/components/schemas/Page"}},
                    },
                    "404": {"description": "Página não encontrada"},
                },
            }
        },
        "/api/health": {
            "get": {
                "tags": ["Health"],
                "summary": "Health check",
                "description": "Verifica o status da API e serviços dependentes",
                "responses": {
                    "200": {
                        "description": "API saudável",
                        "content": {
                            "application/json": {
                                "example": {
                                    "status": "healthy",
                                    "timestamp": "2024-01-01T00:00:00Z",
                                    "services": {
                                        "database": "connected",
                                        "redis": "connected",
                                    },
                                }
                            }
                        },
                    },
                    "503": {"description": "API degradada"},
                },
            }
        },
    },
}


@docs_bp.route("/api/swagger.json")
def swagger_spec():
    """Return the OpenAPI specification."""
    return jsonify(SWAGGER_SPEC)


def register_docs(app):
    """Register the docs blueprint with the app."""
    app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)
    app.register_blueprint(docs_bp)
