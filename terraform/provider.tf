provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "VeloCore"
      Environment = "Production"
      ManagedBy   = "Terraform"
    }
  }
}