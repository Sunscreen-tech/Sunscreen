aws s3 rm s3://sunscreen-docs --recursive
aws s3 sync book s3://sunscreen-docs
aws cloudfront create-invalidation --distribution-id E250PLIECML3N3 --paths /*
