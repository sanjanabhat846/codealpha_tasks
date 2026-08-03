import sys
import os

# Add root and backend directory to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.app import create_app
from backend.config import Config

app = create_app()

if __name__ == '__main__':
    print(f"Starting FAQ Chatbot Server on http://{Config.HOST}:{Config.PORT}...")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
