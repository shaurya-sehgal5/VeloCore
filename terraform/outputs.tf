output "instance_id" {
  value = aws_instance.velocore.id
}

output "public_dns" {
  value = aws_instance.velocore.public_dns
}

output "s3_bucket" {
  value = aws_s3_bucket.velocore_storage.bucket
}

output "public_ip" {
  value = aws_eip.velocore.public_ip
}

output "ssh_command" {
  value = "ssh ubuntu@${aws_eip.velocore.public_ip}"
}

