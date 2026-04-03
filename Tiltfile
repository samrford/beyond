docker_compose('docker-compose.yml')

local_resource(
  'frontend',
  cmd='cd frontend && npm install',
  serve_cmd='cd frontend && npm run dev',
  deps=['frontend/package.json', 'frontend/package-lock.json'],
  ignore=['frontend/node_modules', 'frontend/.next']
)

local_resource(
  'backend',
  cmd='cd backend && go build -o bin/server ./cmd/server',
  serve_cmd='cd backend && ./bin/server',
  env={'DATABASE_URL': 'postgres://beyond:password@localhost:5432/beyond?sslmode=disable'},
  deps=['backend'],
  ignore=['backend/bin']
)
