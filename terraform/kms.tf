module "kms_config" {
  source = "./modules/kms"

  project_id                      = var.project_id
  location                        = var.kms_location # Uses root variable
  key_ring_name                   = var.kms_key_ring_name # Uses root variable
  crypto_key_name                 = var.kms_crypto_key_name # Uses root variable
  prevent_destroy_crypto_key      = var.kms_prevent_destroy_crypto_key # Uses root variable

  github_integration_function_sa_email = module.function_github_integration.function_service_account_email
  users_function_sa_email              = module.function_user.function_service_account_email
}
