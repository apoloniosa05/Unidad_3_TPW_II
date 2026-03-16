# =============================================================================
# Frontend: Amplify (build y hosting del React desde Git)
# Proyecto independiente. Requiere backend desplegado (lee api_url del state).
# Despliegue: terraform init && terraform apply
# El código React se recompila en cada git push a la rama configurada.
# =============================================================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# URL de la API (salida del backend: terraform output -raw api_url)
variable "api_url" {
  description = "URL base de la API de tareas (backend)"
  type        = string
}

variable "github_token" {
  description = "Token de GitHub para que Amplify clone el repo"
  type        = string
  sensitive   = true
}

variable "repository" {
  description = "URL del repositorio Git del frontend"
  type        = string
  default     = "https://github.com/javiercl/vite-hola-fullstack.git"
}

variable "branch_name" {
  description = "Rama que Amplify vigila"
  type        = string
  default     = "main"
}

# Carpeta del frontend, para que solo se compile en la carpeta del frontend
variable "app_root" {
  description = "Carpeta del frontend en el repo (monorepo). Dejar vacío si el repo solo tiene el frontend."
  type        = string
  default     = "frontend"
}

resource "aws_amplify_app" "hola_fullstack" {
  name        = "hola-fullstack"
  repository  = var.repository
  oauth_token = var.github_token

  environment_variables = merge(
    { VITE_API_URL = var.api_url },
    var.app_root != "" ? { AMPLIFY_MONOREPO_APP_ROOT = var.app_root } : {}
  )

  build_spec = <<-EOT
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
EOT

  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.hola_fullstack.id
  branch_name = var.branch_name
}

output "amplify_app_id" {
  description = "ID de la app Amplify"
  value       = aws_amplify_app.hola_fullstack.id
}

output "amplify_default_domain" {
  description = "URL por defecto de la app"
  value       = "https://${var.branch_name}.${aws_amplify_app.hola_fullstack.default_domain}"
}
