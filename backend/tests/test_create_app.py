from api import create_app
app = create_app()
print("OK: app created")
print("Redis:", app.config.get("REDIS_URL"))
print("RATELIMIT_STORAGE_URI:", app.config.get("RATELIMIT_STORAGE_URI"))
import extensions
print("extensions.redis_client:", extensions.redis_client)
