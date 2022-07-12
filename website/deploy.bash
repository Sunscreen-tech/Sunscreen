aws s3 cp src/* s3://sunscreen-site
aws cloudfront create-invalidation --distribution-id E10NWJGCYHNFM4 --paths "/*"
