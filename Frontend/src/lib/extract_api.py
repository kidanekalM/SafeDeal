import re
import json

file = open("api.ts").read()

pattern = r'api\.(get|post|put|patch|delete)\(\s*[`"\']([^`"\']+)'

matches = re.findall(pattern, file)

paths = {}

for method, path in matches:
    # convert /api/escrows/${id} -> /api/escrows/{id}
    path = re.sub(r'\$\{([^}]+)\}', r'{\1}', path)

    if path not in paths:
        paths[path] = {}

    paths[path][method] = {
        "summary": path,
        "responses": {"200": {"description": "OK"}}
    }

openapi = {
    "openapi": "3.0.0",
    "info": {"title": "Generated API", "version": "1.0"},
    "paths": paths
}

with open("openapi.json", "w") as f:
    json.dump(openapi, f, indent=2)

print("✅ openapi.json generated")