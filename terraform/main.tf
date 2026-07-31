
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "velocore_storage" {
  bucket = "${var.bucket_name_prefix}-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "VeloCore Storage"
  }
}

resource "aws_s3_bucket_versioning" "velocore_storage" {
  bucket = aws_s3_bucket.velocore_storage.id

  versioning_configuration {
    status = "Enabled"
  }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "velocore_storage" {
  bucket = aws_s3_bucket.velocore_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "velocore_storage" {
  bucket = aws_s3_bucket.velocore_storage.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_security_group" "velocore" {
  name        = "velocore-sg"
  description = "Security Group for VeloCore"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "VeloCore Dashboard"
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Backend API"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "velocore-sg"
  }
}

resource "aws_iam_role" "velocore_ec2_role" {
  name = "velocore-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "ec2.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "velocore_s3_policy" {
  name = "velocore-s3-policy"

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "s3:*"
        ]

        Resource = [
          aws_s3_bucket.velocore_storage.arn,
          "${aws_s3_bucket.velocore_storage.arn}/*"
        ]
      }
    ]
  })
}
resource "aws_iam_role_policy_attachment" "velocore_s3_attach" {
  role       = aws_iam_role.velocore_ec2_role.name
  policy_arn = aws_iam_policy.velocore_s3_policy.arn
}
resource "aws_iam_instance_profile" "velocore" {
  name = "velocore-instance-profile"
  role = aws_iam_role.velocore_ec2_role.name
}

data "aws_ami" "ubuntu" {
  most_recent = true

  owners = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "velocore" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  key_name = var.key_name

  iam_instance_profile = aws_iam_instance_profile.velocore.name

  vpc_security_group_ids = [
    aws_security_group.velocore.id
  ]

  user_data = templatefile("${path.module}/userdata.sh.tftpl", {
    github_username = var.github_username
    github_repo     = var.github_repo
    bucket_name     = aws_s3_bucket.velocore_storage.bucket
    github_branch   = var.github_branch
  })

  root_block_device {
    volume_size = 30
    volume_type = "gp3"

    encrypted = true
  }
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }
  tags = {
    Name = "VeloCore-Production"
  }
}

resource "aws_eip" "velocore" {
  domain   = "vpc"
  instance = aws_instance.velocore.id

  tags = {
    Name = "velocore-eip"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "velocore_storage" {
  bucket = aws_s3_bucket.velocore_storage.id

  rule {
    id     = "cleanup"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
