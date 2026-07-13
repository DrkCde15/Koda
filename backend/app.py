"""Application entrypoint.

Run with:
    gunicorn "app:app"
    flask --app app:app run
    python app.py
"""
from api import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
