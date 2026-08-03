"""
FAQGenie AI - Flask Backend Application
Modular REST API server powered by NLTK and Scikit-Learn TF-IDF Cosine Similarity.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from backend.config import Config
from backend.services.faq_service import FAQService


def create_app(config_class=Config):
    """
    Application Factory for FAQGenie AI Backend.
    
    Args:
        config_class: Configuration object class.

    Returns:
        Flask: Initialized Flask application.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all routes (enabling cross-origin frontend requests)
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Initialize FAQ Service Layer
    faq_service = FAQService(data_path=app.config['FAQ_DATA_PATH'])

    # ------------------------------------------------------------------
    # Root Welcome Endpoint
    # ------------------------------------------------------------------
    @app.route("/", methods=["GET"])
    def home():
        return jsonify({
            "service": "FAQGenie AI API",
            "status": "running",
            "version": "1.0.0",
            "endpoints": {
                "Health Check": "GET /api/health",
                "Chat API": "POST /chat or POST /api/chat"
            }
        }), 200

    # ------------------------------------------------------------------
    # Health Check Endpoint
    # ------------------------------------------------------------------
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "FAQGenie AI Chatbot Service",
            "model_loaded": faq_service.chatbot.is_fitted
        }), 200

    # ------------------------------------------------------------------
    # Chat API Endpoint (POST /chat & POST /api/chat)
    # ------------------------------------------------------------------
    @app.route("/chat", methods=["POST"])
    @app.route("/api/chat", methods=["POST"])
    def chat():
        """
        Process user query and return best matching FAQ answer.

        Expected Request JSON:
            {
                "message": "How can I reset my password?"
            }

        Expected Response JSON:
            {
                "answer": "Click on the Forgot Password link on the login page to reset your password."
            }
        """

        # 1. Content-Type Validation
        if not request.is_json:
            return jsonify({
                "error": "Invalid Content-Type. Request must be application/json."
            }), 400

        # 2. JSON Body Parsing
        data = request.get_json(silent=True)
        if data is None or not isinstance(data, dict):
            return jsonify({
                "error": "Invalid JSON body provided."
            }), 400

        # 3. Message Key Presence & Type Validation
        if "message" not in data:
            return jsonify({
                "error": "Missing required field: 'message'."
            }), 400

        user_message = data.get("message")

        if not isinstance(user_message, str):
            return jsonify({
                "error": "Field 'message' must be a string."
            }), 400

        clean_message = user_message.strip()

        if len(clean_message) == 0:
            return jsonify({
                "error": "Field 'message' cannot be empty or whitespace only."
            }), 400

        if len(clean_message) > 1000:
            return jsonify({
                "error": "Field 'message' exceeds maximum allowed length of 1000 characters."
            }), 400

        # 4. Generate Answer via NLP Engine
        try:
            response_data = faq_service.get_answer(clean_message)
            
            # Formulate API response matching required specification
            return jsonify({
                "answer": response_data.get("answer")
            }), 200

        except Exception as e:
            app.logger.error(f"Error processing chat request: {e}")
            return jsonify({
                "error": "An internal error occurred while processing your request."
            }), 500

    # ------------------------------------------------------------------
    # HTTP Error Handlers
    # ------------------------------------------------------------------
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": "Bad request. Please check your payload format."
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Requested endpoint or resource was not found."
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "error": "HTTP method not allowed for this endpoint."
        }), 405

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": "Internal server error."
        }), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(
    host=Config.HOST,
    port=Config.PORT,
    debug=True,
    use_reloader=False
)