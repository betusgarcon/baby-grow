"""Recipe recommendation output schemas.

Centralizes Pydantic-based JSON schemas used to constrain LLM output for both
the fixed pipeline and the ReAct agent.
"""

from app.models import ExtractionResult, RecipeRecommendResponse


def get_extraction_schema() -> dict:
    """Return the JSON schema that constrains the extraction output."""
    return ExtractionResult.model_json_schema()


def get_recipe_recommendation_schema() -> dict:
    """Return the schema that constrains the fixed-pipeline recipe output.

    The shape mirrors ``RecipeRecommendResponse`` but drops extra fields and
    uses camelCase keys for the LLM to match the original prompt wording.
    """
    schema = RecipeRecommendResponse.model_json_schema()
    # Build a clean schema for the model. We intentionally define it inline
    # so that the contract is explicit and not accidentally broadened by new
    # response fields.
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "summary": {"type": "string"},
            "items": {
                "type": "array",
                "minItems": 1,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "mealType": {"type": "string"},
                        "dishName": {"type": "string"},
                        "reason": {"type": "string"},
                        "ingredients": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "source_chunk_ids": {
                            "type": "array",
                            "items": {"type": "integer"},
                        },
                    },
                    "required": ["mealType", "dishName", "reason", "ingredients"],
                },
            },
            "avoidItems": {"type": "array", "items": {"type": "string"}},
            "reason": {"type": "string"},
            "confidence": {"type": "number"},
        },
        "required": ["summary", "items", "avoidItems", "reason", "confidence"],
    }
