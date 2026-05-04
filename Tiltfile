docker_compose('docker-compose.yml')

local_resource(
  'frontend',
  cmd='cd frontend && npm install',
  serve_cmd='cd frontend && npm run dev',
  deps=['frontend/package.json'],
  ignore=['frontend/node_modules', 'frontend/.next']
)

# Load backend/.env (gitignored) into a dict. Values there override the dev
# defaults below, so secrets stay out of the repo.
def load_dotenv(path):
    result = {}
    contents = str(read_file(path, default=''))
    for line in contents.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        k, v = line.split('=', 1)
        v = v.strip()
        # Strip surrounding single or double quotes if present.
        if len(v) >= 2 and ((v[0] == '"' and v[-1] == '"') or (v[0] == "'" and v[-1] == "'")):
            v = v[1:-1]
        result[k.strip()] = v
    return result

dotenv = load_dotenv('backend/.env')

def envvar(key, fallback=''):
    return dotenv.get(key, os.environ.get(key, fallback))

# Dev defaults match docker-compose.yml — `tilt up` works out of the box with
# no .env file. Override anything in backend/.env. Google Photos integration
# is optional; the backend logs "Google Photos integration disabled" if the
# four GOOGLE_* values are empty.
backend_env = {
    'DATABASE_URL':                envvar('DATABASE_URL', 'postgres://beyond:password@localhost:5432/beyond?sslmode=disable'),
    'MINIO_ENDPOINT':              envvar('MINIO_ENDPOINT', 'localhost:9000'),
    'MINIO_USER':                  envvar('MINIO_USER', 'beyond-admin'),
    'MINIO_PASSWORD':              envvar('MINIO_PASSWORD', 'beyond-password'),
    'MINIO_PUBLIC_URL':            envvar('MINIO_PUBLIC_URL', 'http://localhost:9000'),
    'SUPABASE_URL':                envvar('SUPABASE_URL'),
    'GOOGLE_CLIENT_ID':            envvar('GOOGLE_CLIENT_ID'),
    'GOOGLE_CLIENT_SECRET':        envvar('GOOGLE_CLIENT_SECRET'),
    'GOOGLE_REDIRECT_URL':         envvar('GOOGLE_REDIRECT_URL', 'http://localhost:8080/api/integrations/google/callback'),
    'GOOGLE_TOKEN_ENCRYPTION_KEY': envvar('GOOGLE_TOKEN_ENCRYPTION_KEY'),
}

local_resource(
  'backend',
  serve_cmd='cd backend && go run ./cmd/server',
  serve_env=backend_env,
  deps=['backend'],
  ignore=['backend/bin']
)
