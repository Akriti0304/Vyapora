import json
import os
import re
from typing import Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field, field_validator

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
PRUNE_API_KEY = os.getenv("PRUNE_API_KEY", "")
CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")
STT_MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
PRUNE_UNIFIED_CHAT_URL = "https://api.withprune.com/v1/chat/completions"

app = FastAPI(
    title="VYAPORA AI Service",
    description="Hindi/Hinglish retail message understanding and voice transcription",
    version="0.1.0",
)

class UnderstandRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language_hint: Optional[str] = None
    shop_id: Optional[str] = None

class Item(BaseModel):
    product_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = None

class UnderstandResponse(BaseModel):
    intent: Literal[
        "INVENTORY_ADD", "INVENTORY_REMOVE", "INVENTORY_CHECK",
        "NEW_ORDER", "PAYMENT", "ORDER_STATUS", "GENERAL_MESSAGE", "UNCLEAR"
    ]
    language: str = "unknown"
    items: list[Item] = []
    customer_name: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "INR"
    requires_confirmation: bool = True
    clarification_question: Optional[str] = None
    reasoning_short: str = ""

    @field_validator("items")
    @classmethod
    def cap_items(cls, value):
        if len(value) > 30:
            raise ValueError("Too many extracted items")
        return value

SYSTEM_PROMPT = """
You are VYAPORA, an assistant that understands Indian small-shop and kirana business messages.
Understand Hindi, Hinglish (Hindi written in Latin script), English, and mixed language.
Return ONLY valid JSON. Do not execute actions, invent missing facts, prices, products, or quantities.

Allowed intent values:
INVENTORY_ADD, INVENTORY_REMOVE, INVENTORY_CHECK, NEW_ORDER, PAYMENT,
ORDER_STATUS, GENERAL_MESSAGE, UNCLEAR.

Return this exact JSON shape:
{
 "intent": "...",
 "language": "hindi|hinglish|english|mixed|other|unknown",
 "items": [{"product_name":"...", "quantity":0.5, "unit":"kg", "price":null, "notes":null}],
 "customer_name": null,
 "amount": null,
 "currency": "INR",
 "requires_confirmation": true,
 "clarification_question": null,
 "reasoning_short": "short explanation"
}

Rules:
- "aadha kilo" = 0.5 kg; "paav kilo" = 0.25 kg; "dedh kilo" = 1.5 kg;
  "dhai kilo" = 2.5 kg; "sau gram" = 100 g; "do darjan" = 24 pieces.
- Keep units distinct: kg, g, litre, ml, packet, bottle, piece, dozen.
  Do not convert packet/bottle/piece into weight or volume.
- If quantity/unit/product is unclear, use null for the uncertain field and ask a clarification question.
- Do not infer price. Price must be null unless explicitly stated.
- Distinguish stock being added/removed from a customer placing an order.
- If the user says they paid, classify PAYMENT but do not claim payment is verified.
- Always set requires_confirmation=true for any business-changing intent.
- For general or unclear messages, return empty items.
- Preserve product name in the language used; don't guess a catalogue match.
"""

def strip_json_fence(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.I)
    s = re.sub(r"\s*```$", "", s)
    return s.strip()

async def groq_chat(text: str, language_hint: Optional[str], shop_id: Optional[str] = None) -> dict:
    if not PRUNE_API_KEY and not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="Neither PRUNE_API_KEY nor GROQ_API_KEY is configured")

    user_prompt = f"Language hint: {language_hint or 'auto-detect'}\nMessage: {text}"

    async with httpx.AsyncClient(timeout=45) as client:
        # 1. Try Prune gateway first (using verified Google Gemini)
        if PRUNE_API_KEY:
            try:
                prune_headers = {
                    "Authorization": f"Bearer {PRUNE_API_KEY}",
                    "X-Prune-Feature-Id": "kirana-intent-extraction",
                }
                if shop_id:
                    prune_headers["X-Prune-Customer-Id"] = shop_id

                prune_resp = await client.post(
                    PRUNE_UNIFIED_CHAT_URL,
                    headers=prune_headers,
                    json={
                        "model": "gemini-flash-lite-latest",
                        "temperature": 0,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                    },
                )
                if prune_resp.status_code < 400:
                    data = prune_resp.json()
                    raw = None
                    if isinstance(data.get("choices"), list) and data["choices"]:
                        raw = data["choices"][0].get("message", {}).get("content")
                    elif isinstance(data.get("candidates"), list) and data["candidates"]:
                        raw = data["candidates"][0]["content"]["parts"][0]["text"]
                    if raw:
                        return json.loads(strip_json_fence(raw))
            except Exception as e:
                print(f"Prune parse/call warning, falling back to Groq: {e}")

        # 2. Automatic fallback to Groq directly if needed
        if GROQ_API_KEY:
            response = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": CHAT_MODEL,
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            if response.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"AI provider error: {response.text[:500]}")
            raw = response.json()["choices"][0]["message"]["content"]
            try:
                return json.loads(strip_json_fence(raw))
            except json.JSONDecodeError:
                raise HTTPException(status_code=502, detail="AI returned invalid JSON; please retry")

    raise HTTPException(status_code=502, detail="No valid response from AI provider")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "vyapora-ai",
        "prune_enabled": bool(PRUNE_API_KEY),
        "chat_model": CHAT_MODEL,
        "stt_model": STT_MODEL,
    }

@app.post("/understand", response_model=UnderstandResponse)
async def understand(req: UnderstandRequest):
    result = await groq_chat(req.text, req.language_hint, req.shop_id)
    try:
        parsed = UnderstandResponse.model_validate(result)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI output failed validation: {str(exc)[:300]}")
    return parsed

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: Optional[str] = None):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured")
    if audio.content_type and not (
        audio.content_type.startswith("audio/") or audio.content_type in ("application/octet-stream",)
    ):
        raise HTTPException(status_code=415, detail="Please upload an audio file")
    content = await audio.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file must be 20 MB or smaller")
    files = {"file": (audio.filename or "voice-note.ogg", content, audio.content_type or "application/octet-stream")}
    data = {"model": STT_MODEL, "response_format": "json"}
    if language:
        data["language"] = language
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{GROQ_BASE_URL}/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            data=data,
            files=files,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Transcription provider error: {response.text[:500]}")
    transcript = response.json().get("text", "").strip()
    if not transcript:
        raise HTTPException(status_code=502, detail="No speech could be transcribed")
    understood = await groq_chat(transcript, language)
    parsed = UnderstandResponse.model_validate(understood)
    return {"transcript": transcript, "understanding": parsed.model_dump()}