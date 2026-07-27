import redis
r = redis.from_url("redis://localhost:6379/0", decode_responses=True)
print("PING:", r.ping())
