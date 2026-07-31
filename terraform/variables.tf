variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "key_name" {
  type = string
}



variable "bucket_name_prefix" {
  type    = string
  default = "velocore-storage"
}
variable "github_repo" {
  type = string
}

variable "github_branch" {
  default = "main"
}

variable "github_username" {
  type = string
}