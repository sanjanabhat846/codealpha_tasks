"""
FAQGenie AI - FAQ Service Layer
"""

from backend.chatbot import FAQChatbot


class FAQService:
    """
    Service class managing FAQ data loading and matching operations.
    Acts as an abstraction layer between API routes and the NLP chatbot engine.
    """

    def __init__(self, data_path: str = None):
        self.chatbot = FAQChatbot(data_path=data_path)

    def reload(self) -> bool:
        """Reload dataset and retrain model."""
        return self.chatbot.load_and_train()

    def get_answer(self, message: str) -> dict:
        """
        Get FAQ answer for user message.

        Args:
            message (str): User query message.

        Returns:
            dict: Dictionary with 'answer' string and matching details.
        """
        return self.chatbot.get_response(message)
