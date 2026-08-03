"""
FAQGenie AI - Text Preprocessing & NLP Utilities
"""

import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer

# Flag to track whether NLTK data resources have been verified
_NLTK_INITIALIZED = False

def ensure_nltk_resources():
    """
    Safely download and initialize required NLTK resource packages.
    Prevents runtime crashes if resources are missing.
    """
    global _NLTK_INITIALIZED
    if _NLTK_INITIALIZED:
        return

    resources = [
        ('tokenizers/punkt', 'punkt'),
        ('tokenizers/punkt_tab', 'punkt_tab'),
        ('corpora/stopwords', 'stopwords'),
        ('corpora/wordnet', 'wordnet')
    ]

    for path, name in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            try:
                nltk.download(name, quiet=True)
            except Exception as e:
                print(f"[NLTK Warning] Could not download '{name}': {e}")

    _NLTK_INITIALIZED = True


def preprocess_text(text: str) -> str:
    """
    Preprocess input text for NLP matching:
    1. Lowercase conversion
    2. Removal of special characters and punctuation
    3. Tokenization
    4. Stop word removal
    5. Lemmatization

    Args:
        text (str): Raw user query or FAQ question.

    Returns:
        str: Cleaned, preprocessed text string.
    """
    if not text or not isinstance(text, str):
        return ""

    # Ensure NLTK resources are available
    ensure_nltk_resources()

    # 1. Convert to lowercase
    clean_str = text.lower().strip()

    # 2. Remove special characters and digits (keep letters and space)
    clean_str = re.sub(r'[^a-z\s]', '', clean_str)

    # 3. Tokenize
    try:
        tokens = word_tokenize(clean_str)
    except Exception:
        # Fallback simple split if word_tokenize fails
        tokens = clean_str.split()

    # 4. Filter stop words & lemmatize
    try:
        stop_words = set(stopwords.words('english'))
    except Exception:
        # Simple fallback stop words set
        stop_words = {'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'and', 'or', 'you', 'your', 'i', 'my', 'can', 'how', 'what', 'do'}

    try:
        lemmatizer = WordNetLemmatizer()
        cleaned_tokens = [
            lemmatizer.lemmatize(token)
            for token in tokens
            if token not in stop_words and len(token) > 1
        ]
    except Exception:
        cleaned_tokens = [token for token in tokens if token not in stop_words and len(token) > 1]

    # Rejoin tokens into a single clean string
    return " ".join(cleaned_tokens) if cleaned_tokens else clean_str
