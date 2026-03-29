# Populate CachedFood test data
curl -X POST http://localhost:3000/api/cached-foods \
  -H "Content-Type: application/json" \
  -d '{
    "normalizedKey": "chicken breast 100g",
    "originalText": "100g grilled chicken breast",
    "name": "Chicken Breast",
    "calories": 165,
    "proteinG": 31,
    "carbsG": 0,
    "fatG": 3.6,
    "aiConfidence": 0.95
  }'

echo ""

curl -X POST http://localhost:3000/api/cached-foods \
  -H "Content-Type: application/json" \
  -d '{
    "normalizedKey": "rice bowl 200g",
    "originalText": "200g white rice",
    "name": "White Rice",
    "calories": 260,
    "proteinG": 4,
    "carbsG": 57,
    "fatG": 0.5,
    "aiConfidence": 0.92
  }'

echo ""

curl -X POST http://localhost:3000/api/cached-foods \
  -H "Content-Type: application/json" \
  -d '{
    "normalizedKey": "salmon fillet 150g",
    "originalText": "150g salmon fillet",
    "name": "Salmon Fillet",
    "calories": 280,
    "proteinG": 35,
    "carbsG": 0,
    "fatG": 15,
    "aiConfidence": 0.94
  }'

echo ""

curl -X POST http://localhost:3000/api/cached-foods \
  -H "Content-Type: application/json" \
  -d '{
    "normalizedKey": "greek yogurt 200g",
    "originalText": "200g Greek yogurt",
    "name": "Greek Yogurt",
    "calories": 130,
    "proteinG": 20,
    "carbsG": 6,
    "fatG": 0,
    "aiConfidence": 0.96
  }'

echo ""

curl -X POST http://localhost:3000/api/cached-foods \
  -H "Content-Type: application/json" \
  -d '{
    "normalizedKey": "avocado half",
    "originalText": "half an avocado",
    "name": "Avocado",
    "calories": 120,
    "proteinG": 1.5,
    "carbsG": 6,
    "fatG": 11,
    "aiConfidence": 0.93
  }'

echo ""

curl -X POST http://localhost:3000/api/cached-foods \
  -H "Content-Type: application/json" \
  -d '{
    "normalizedKey": "banana large",
    "originalText": "one large banana",
    "name": "Banana",
    "calories": 105,
    "proteinG": 1.3,
    "carbsG": 27,
    "fatG": 0.4,
    "aiConfidence": 0.97
  }'

echo ""

echo "Test foods populated successfully!"
echo "Fetching all cached foods..."
curl -s http://localhost:3000/api/cached-foods | python -m json.tool 2>/dev/null || curl -s http://localhost:3000/api/cached-foods
