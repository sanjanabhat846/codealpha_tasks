import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration parameters for the FAQGenie AI Flask Backend."""
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'faqgenie-secret-key-production-change')
    DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    PORT = int(os.getenv('PORT', 5000))
    HOST = os.getenv('HOST', '0.0.0.0')

    # Path settings
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    FAQ_DATA_PATH = os.getenv('FAQ_DATA_PATH', os.path.join(BASE_DIR, 'data', 'faq.json'))

    # NLP Similarity Threshold (Cosine similarity 0.0 - 1.0)
    SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', '0.2'))

    # Fallback message when similarity score is below threshold
    FALLBACK_RESPONSE = "I'm sorry, I couldn't find a matching answer."
