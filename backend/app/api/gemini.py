import asyncio
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.gemini_service import scan_item_from_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gemini", tags=["gemini"])


class ItemScanRequest(BaseModel):
    image_base64: str  # base64 with or without data URL prefix
    mime_type: str | None = None


class ItemScanResponse(BaseModel):
    name: str | None = None
    sku: str | None = None
    unit_of_measure: str | None = None
    barcode: str | None = None
    description: str | None = None


@router.post(
    "/scan-item",
    response_model=ItemScanResponse,
    summary="Extract item details from a product photo using Gemini AI",
)
async def scan_item(request: ItemScanRequest):
    """
    Accepts a base64-encoded product image and returns suggested item field values
    (name, SKU, unit of measure, barcode) via Gemini multimodal analysis.
    """
    try:
        result = await asyncio.to_thread(
            scan_item_from_image, request.image_base64
        )
        return ItemScanResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except RuntimeError as exc:
        logger.exception("scan_item endpoint failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
