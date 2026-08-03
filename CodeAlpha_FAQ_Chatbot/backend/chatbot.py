"""
FAQGenie AI - FAQ Chatbot Engine (TF-IDF & Cosine Similarity)
"""

import json
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.config import Config
from backend.utils import preprocess_text


class FAQChatbot:
    """
    NLP Engine utilizing TF-IDF Vectorization and Cosine Similarity
    to match user queries against pre-defined FAQ dataset entries.
    """

    def __init__(self, data_path: str = None, threshold: float = None):
        """
        Initialize the FAQChatbot instance.

        Args:
            data_path (str, optional): Path to the JSON dataset file.
            threshold (float, optional): Similarity score cut-off (0.0 to 1.0).
        """
        self.data_path = data_path or Config.FAQ_DATA_PATH
        self.threshold = threshold if threshold is not None else Config.SIMILARITY_THRESHOLD
        self.fallback_response = Config.FALLBACK_RESPONSE

        self.faqs = []
        self.raw_questions = []
        self.preprocessed_questions = []
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        self.tfidf_matrix = None
        self.is_fitted = False

        # Load dataset and build TF-IDF model upon initialization
        self.load_and_train()

    def load_and_train(self) -> bool:
        """
        Load FAQ dataset from JSON file and fit the TF-IDF vectorizer.

        Returns:
            bool: True if dataset loaded and fitted successfully, False otherwise.
        """
        if not os.path.exists(self.data_path):
            print(f"[Error] FAQ dataset file not found at: {self.data_path}")
            return False

        try:
            with open(self.data_path, 'r', encoding='utf-8') as f:
                self.faqs = json.load(f)

            if not self.faqs or not isinstance(self.faqs, list):
                print("[Error] FAQ dataset is empty or invalid JSON structure.")
                return False

            self.raw_questions = [faq.get("question", "") for faq in self.faqs]
            
            # Preprocess each question in dataset
            self.preprocessed_questions = [
                preprocess_text(q) for q in self.raw_questions
            ]

            # Fit TF-IDF Vectorizer and create matrix
            self.tfidf_matrix = self.vectorizer.fit_transform(self.preprocessed_questions)
            self.is_fitted = True
            print(f"[FAQChatbot] Model successfully trained on {len(self.faqs)} FAQ questions.")
            return True

        except Exception as e:
            print(f"[Error] Failed to train FAQChatbot model: {e}")
            return False

    def get_response(self, user_query: str) -> dict:
        """
        Process user query and return best matching answer based on Cosine Similarity.

        Args:
            user_query (str): Raw string message submitted by user.

        Returns:
            dict: Dictionary containing "answer", "score", "matched_question" or fallback message.
        """
        if not self.is_fitted:
            success = self.load_and_train()
            if not success:
                return {
                    "answer": self.fallback_response,
                    "confidence": 0.0,
                    "matched_question": None
                }

        # Clean and preprocess user query
        clean_query = preprocess_text(user_query)

        # Fallback if preprocessed text is empty
        if not clean_query:
            return {
                "answer": self.fallback_response,
                "confidence": 0.0,
                "matched_question": None
            }

        try:
            # Transform user query into vector space
            query_vector = self.vectorizer.transform([clean_query])

            # Calculate cosine similarity with all FAQ questions
            similarity_scores = cosine_similarity(query_vector, self.tfidf_matrix).flatten()

            # Find highest score and corresponding index
            best_idx = np.argmax(similarity_scores)
            best_score = float(similarity_scores[best_idx])

            # Check if highest score satisfies threshold requirement
            if best_score >= self.threshold:
                matched_faq = self.faqs[best_idx]
                return {
                    "answer": matched_faq.get("answer", self.fallback_response),
                    "confidence": round(best_score, 4),
                    "matched_question": matched_faq.get("question", "")
                }
            else:
                return {
                    "answer": self.fallback_response,
                    "confidence": round(best_score, 4),
                    "matched_question": None
                }

        except Exception as e:
            print(f"[Error] Exception occurred during response retrieval: {e}")
            return {
                "answer": self.fallback_response,
                "confidence": 0.0,
                "matched_question": None
            }
