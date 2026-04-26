#!/bin/bash
# Creates test users via the API
# Usage: bash scripts/seed_test_users.sh

API="http://localhost:3000/api"
PASS="Test123!"

echo "Seeding test users..."

for user in seller buyer simple_seller simple_buyer admin; do
  echo "Creating ${user}@test.com..."
  curl -s -X POST "$API/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${user}@test.com\",
      \"password\": \"$PASS\",
      \"full_name\": \"Test ${user}\",
      \"phone\": \"+251900000000\"
    }" > /dev/null
done

echo ""
echo "Done. Test users created:"
echo "  seller@test.com         / Test123!"
echo "  buyer@test.com          / Test123!"
echo "  simple_seller@test.com  / Test123!"
echo "  simple_buyer@test.com   / Test123!"
echo "  admin@test.com          / Test123!"