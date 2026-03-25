"""
Gemini AI Service — Medaxas Inventory Counter

Adapted from DivoMed_Invent_Tracker gemini_service.py.
Provides a single function: scan_item_from_image
which analyzes a product photo and returns suggested item fields.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# Get Gemini API key from environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Gemini models: primary for image analysis, fallback if primary fails
MEDIA_PRIMARY_MODEL = os.getenv("GEMINI_MEDIA_PRIMARY_MODEL", "gemini-3-pro-preview")
MEDIA_FALLBACK_MODEL = os.getenv("GEMINI_MEDIA_FALLBACK_MODEL", "gemini-3.1-pro-preview")

# Lazy-initialized client
_gemini_client = None


def _get_client():
    """Get or create the Gemini client (lazy initialization)."""
    global _gemini_client
    if _gemini_client is None:
        from google import genai  # type: ignore

        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client


def _validate_api_key() -> None:
    """Validate that the Gemini API key is configured."""
    if not GEMINI_API_KEY or not GEMINI_API_KEY.strip():
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Set GEMINI_API_KEY in your .env file."
        )


def _parse_data_url(image_base64: str) -> tuple[str, str]:
    """Extract raw base64 data and mime type from a data URL or plain base64."""
    if image_base64.startswith("data:") and "," in image_base64:
        header, data = image_base64.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
        return data, mime_type
    return image_base64, "image/jpeg"


def _generate_with_fallback(contents, config, context: str = "Gemini API") -> str:
    """
    Call Gemini with the primary model and fall back to the secondary on failure.
    Adapted from DivoMed gemini_service._generate_with_fallback.

    Returns:
        str: Text response from the successful model.

    Raises:
        RuntimeError: If both models fail.
    """
    client = _get_client()

    # Attempt primary model
    try:
        response = client.models.generate_content(
            model=MEDIA_PRIMARY_MODEL,
            contents=contents,
            config=config,
        )
        if response and response.text:
            return response.text
        raise RuntimeError("Empty response from primary model")
    except Exception as primary_err:
        if MEDIA_PRIMARY_MODEL == MEDIA_FALLBACK_MODEL:
            raise RuntimeError(
                f"Failed to call {context} ({MEDIA_PRIMARY_MODEL}): {primary_err}"
            )
        logger.warning(
            "%s: primary model %s failed (%s), falling back to %s",
            context,
            MEDIA_PRIMARY_MODEL,
            primary_err,
            MEDIA_FALLBACK_MODEL,
        )

    # Attempt fallback model
    try:
        response = client.models.generate_content(
            model=MEDIA_FALLBACK_MODEL,
            contents=contents,
            config=config,
        )
        if response and response.text:
            logger.info("%s: fallback model %s succeeded", context, MEDIA_FALLBACK_MODEL)
            return response.text
        raise RuntimeError("Empty response from fallback model")
    except Exception as fallback_err:
        raise RuntimeError(
            f"Failed to call {context}: primary ({MEDIA_PRIMARY_MODEL}) and "
            f"fallback ({MEDIA_FALLBACK_MODEL}) both failed. "
            f"Fallback error: {fallback_err}"
        )


_ITEM_SCAN_PROMPT = """\
You are an inventory assistant. Analyze this product image and extract information \
to help pre-fill an item creation form.

Return a single JSON object (not an array) with these fields:
{
  "name": "product name — be specific (e.g. 'Nitrile Exam Gloves Medium' not just 'Gloves')",
  "sku": "suggested SKU code — derive from brand/product if possible, or null",
  "unit_of_measure": "extract unit of measure. Prefer EXACT matches: ['ea', 'box', 'pack', 'bottle', 'kg', 'L', 'mL', 'other']. If none match perfectly, extract a concise custom unit description (e.g. 'box of 100'), or null",
  "barcode": "barcode / UPC number if visible on the packaging, or null",
  "description": "one-sentence product description or null"
}

Rules:
- Return ONLY valid JSON with no markdown or extra text.
- Use null for any field you cannot determine from the image.
- Keep all string values concise.
"""


def scan_item_from_image(image_base64: str) -> dict[str, Any]:
    """
    Analyze a product photo with Gemini and return pre-fill data for the item form.

    Args:
        image_base64: Base64-encoded image, with or without data URL prefix.

    Returns:
        Dict with keys: name, sku, unit_of_measure, barcode, description.
        Any field that could not be determined will be None.

    Raises:
        ValueError: If GEMINI_API_KEY is not set.
        RuntimeError: If both primary and fallback models fail.
    """
    _validate_api_key()

    raw_b64, mime_type = _parse_data_url(image_base64)
    image_bytes = base64.b64decode(raw_b64)

    from google.genai import types  # type: ignore

    contents = types.Content(
        parts=[
            types.Part(text=_ITEM_SCAN_PROMPT),
            types.Part(
                inline_data=types.Blob(mime_type=mime_type, data=image_bytes)
            ),
        ]
    )
    config = types.GenerateContentConfig(
        temperature=0.1,
        response_mime_type="application/json",
    )

    text = _generate_with_fallback(contents, config, context="Item scan")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON: %s", text)
        raise RuntimeError("Gemini returned an unexpected response format.") from exc

    # Normalize: ensure all expected keys exist
    fields = ("name", "sku", "unit_of_measure", "barcode", "description")
    return {field: data.get(field) for field in fields}
