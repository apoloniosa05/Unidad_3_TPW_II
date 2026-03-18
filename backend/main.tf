# =============================================================================
# Backend: API de tareas (DynamoDB + Lambda + API Gateway HTTP)
# Despliegue: terraform init && terraform apply
# =============================================================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# ---------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------
resource "aws_dynamodb_table" "tareas" {
  name         = "tareas-hola-fullstack"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# ---------------------------------------------------------------------------
# Lambda
# ---------------------------------------------------------------------------
resource "aws_iam_role" "lambda_tasks" {
  name = "lambda-tasks-api-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_tasks_dynamodb" {
  name = "dynamodb"
  role = aws_iam_role.lambda_tasks.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"]
        Resource = [aws_dynamodb_table.tareas.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "null_resource" "lambda_npm_install" {
  triggers = {
    package_json = filemd5("${path.module}/lambda/tasks-api/package.json")
    index        = filemd5("${path.module}/lambda/tasks-api/index.mjs")
  }
  provisioner "local-exec" {
    command = "cd ${path.module}/lambda/tasks-api && npm install"
  }
}

data "archive_file" "lambda_tasks" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/tasks-api"
  output_path = "${path.module}/lambda/tasks-api.zip"
  depends_on  = [null_resource.lambda_npm_install]
}

resource "aws_lambda_function" "tasks_api" {
  filename         = data.archive_file.lambda_tasks.output_path
  function_name    = "tasks-api-hola-fullstack"
  role             = aws_iam_role.lambda_tasks.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_tasks.output_base64sha256
  runtime          = "nodejs20.x"

  environment {
    variables = { TABLE_NAME = aws_dynamodb_table.tareas.name }
  }
}

# ---------------------------------------------------------------------------
# API Gateway HTTP API
# ---------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "tasks" {
  name          = "tasks-api-hola-fullstack"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers  = ["Content-Type"]
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.tasks.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.tasks_api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.tasks.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.tasks.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_deployment" "tasks" {
  api_id = aws_apigatewayv2_api.tasks.id
  depends_on = [
    aws_apigatewayv2_route.proxy,
    aws_apigatewayv2_route.root,
  ]
}

resource "aws_apigatewayv2_stage" "default" {
  api_id        = aws_apigatewayv2_api.tasks.id
  name          = "$default"
  deployment_id = aws_apigatewayv2_deployment.tasks.id
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tasks_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.tasks.execution_arn}/*/*"
}

output "api_url" {
  description = "URL base de la API de tareas"
  value        = aws_apigatewayv2_stage.default.invoke_url
}

# 1. Creamos el Grupo de Usuarios (User Pool) - VERSIÓN CORREGIDA
resource "aws_cognito_user_pool" "pool" {
  name = "Unidad3_UserPool_V2" # Le cambiamos el nombre para evitar conflictos de caché

  # Esto obliga a que el usuario entre con su Email y lo verifique al registrarse
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
  }

  # Configuramos la plantilla del mensaje para asegurar que use CÓDIGO
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Tu código de verificación para Task Master Pro es {####}"
    email_subject        = "Código de Verificación"
  }

  # Definimos el esquema del email como obligatorio desde el inicio
  schema {
    attribute_data_type      = "String"
    name                     = "email"
    required                 = true
    mutable                  = true
  }
}

# 2. Creamos el Cliente de la Aplicación (App Client)
resource "aws_cognito_user_pool_client" "client" {
  name         = "ReactAppClient"
  user_pool_id = aws_cognito_user_pool.pool.id
  
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}

# 3. Outputs
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.pool.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.client.id
}