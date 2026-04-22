docker_compose('docker-compose.yml')

local_resource(
  'frontend',
  cmd='cd frontend && npm install',
  serve_cmd='cd frontend && npm run dev',
  deps=['frontend/package.json'],
  ignore=['frontend/node_modules', 'frontend/.next']
)

# Load backend/.env (gitignored) into a dict. Values there override shell env,
# so you can drop a file at backend/.env and never think about it again.
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

env = load_dotenv('backend/.env')

def envvar(key, fallback=''):
    return env.get(key, os.environ.get(key, fallback))

# Google Photos integration — optional. Drop values into backend/.env (or your
# shell env) to enable. Missing values are fine; the backend will just log
# "Google Photos integration disabled".
google_client_id     = envvar('GOOGLE_CLIENT_ID')
google_client_secret = envvar('GOOGLE_CLIENT_SECRET')
google_redirect_url  = envvar('GOOGLE_REDIRECT_URL', 'http://localhost:8080/api/integrations/google/callback')
google_enc_key       = envvar('GOOGLE_TOKEN_ENCRYPTION_KEY')

local_resource(
  'backend',
  cmd='cd backend && go build -o bin/server ./cmd/server',
  serve_cmd='''
    cd backend && \
    DATABASE_URL="postgres://beyond:password@localhost:5432/beyond?sslmode=disable" \
    MINIO_ENDPOINT="localhost:9000" \
    MINIO_USER="beyond-admin" \
    MINIO_PASSWORD="beyond-password" \
    MINIO_PUBLIC_URL="http://localhost:9000" \
    SUPABASE_URL="https://zzoxjjkljxbaycmubwog.supabase.co" \
    GOOGLE_CLIENT_ID="''' + google_client_id + '''" \
    GOOGLE_CLIENT_SECRET="''' + google_client_secret + '''" \
    GOOGLE_REDIRECT_URL="''' + google_redirect_url + '''" \
    GOOGLE_TOKEN_ENCRYPTION_KEY="''' + google_enc_key + '''" \
    ./bin/server
  ''',
  deps=['backend'],
  ignore=['backend/bin']
)
