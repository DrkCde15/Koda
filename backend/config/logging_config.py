"""Structured logging configuration.

Provides JSON-formatted logs for production and human-readable logs for development.
Supports correlation IDs for request tracing.
"""
import logging
import sys
import json
from datetime import datetime
from flask import Flask, request, has_request_context
from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON log formatter with additional fields."""
    
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record["timestamp"] = datetime.utcnow().isoformat()
        
        # Add log level
        log_record["level"] = record.levelname
        
        # Add request context if available
        if has_request_context():
            log_record["request_id"] = getattr(request, "request_id", None)
            log_record["method"] = request.method
            log_record["path"] = request.path
            log_record["remote_addr"] = request.remote_addr
            
        # Add service info
        log_record["service"] = "koda-backend"
        log_record["version"] = "1.0.0"


def configure_logging(app: Flask):
    """Configure structured logging for the Flask application."""
    
    log_level = getattr(logging, app.config.get("LOG_LEVEL", "INFO").upper())
    log_format = app.config.get("LOG_FORMAT", "json")
    
    # Remove existing handlers
    app.logger.handlers.clear()
    
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    
    if log_format == "json":
        # JSON format for production (log aggregation systems)
        formatter = CustomJsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s"
        )
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    app.logger.setLevel(log_level)
    
    # Configure third-party loggers
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("redis").setLevel(logging.WARNING)
    
    app.logger.info(
        f"Logging configured: level={logging.getLevelName(log_level)}, format={log_format}"
    )


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name."""
    return logging.getLogger(f"koda.{name}")
