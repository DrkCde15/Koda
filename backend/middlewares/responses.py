"""Standardised API response helpers.

Every endpoint returns the same envelope so clients can parse responses
uniformly:

    success -> {"success": true, "message": str, "data": Any}
    error   -> {"success": false, "message": str, "errors": list}
"""
from typing import Any

from flask import jsonify


def success(message: str, data: Any = None, status_code: int = 200):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def error(message: str, errors: Any = None, status_code: int = 400):
    payload = {"success": False, "message": message}
    payload["errors"] = errors if errors is not None else []
    return jsonify(payload), status_code
