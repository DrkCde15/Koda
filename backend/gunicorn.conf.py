"""Gunicorn server configuration for Koda.

Single worker with a thread pool on purpose: the SSE notification broker
(services/notification_broker.py) and the rate limiter fallback are
process-local, so multiple workers would silently break realtime
notifications and per-worker rate-limit accounting. Threads provide
concurrency for normal requests while SSE connections stay in-process.
"""
import os

bind = os.getenv("GUNICORN_BIND", "localhost:5000")
workers = int(os.getenv("GUNICORN_WORKERS", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "8"))
worker_class = "gthread"

# SSE streams emit a heartbeat every 15s; never let gunicorn kill a worker
# that is streaming. Long-running requests only block their own thread.
timeout = int(os.getenv("GUNICORN_TIMEOUT", "0"))
graceful_timeout = 30

# Request logs are already produced by the app (after_request hook).
accesslog = os.getenv("GUNICORN_ACCESSLOG")
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOGLEVEL", "info")
