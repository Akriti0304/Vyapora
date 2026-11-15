# VYAPORA AI Service (hackathon starter)

A separate Python service for:
1. Hindi/Hinglish/English text understanding → structured business JSON
2. WhatsApp voice-note transcription → text → structured business JSON

It does **not** write to Supabase or change stock. Your Node backend must validate the result, show a preview, get shopkeeper confirmation, and only then save.

## 1. Run locally

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Put your Groq API key in `.env`, then:

```bash
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` to test the API.

## 2. Test text understanding

```bash
curl -X POST http://localhost:8000/understand \
  -H "Content-Type: application/json" \
  -d '{"text":"Bhai stock mein aadha kilo chini aur 2 litre sarson ka tel add kar do"}'
```

Expected shape (actual model wording can differ):

```json
{
  "intent": "INVENTORY_ADD",
  "language": "hinglish",
  "items": [
    {"product_name":"chini","quantity":0.5,"unit":"kg","price":null,"notes":null},
    {"product_name":"sarson ka tel","quantity":2,"unit":"litre","price":null,"notes":null}
  ],
  "customer_name": null,
  "amount": null,
  "currency": "INR",
  "requires_confirmation": true,
  "clarification_question": null,
  "reasoning_short": "The speaker asked to add stock."
}
```

## 3. Test voice transcription

```bash
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@voice-note.ogg"
```

The service returns the transcript plus the structured understanding. WhatsApp audio commonly arrives as OGG/Opus; test with the exact media format your WhatsApp integration downloads.

## 4. Connect from Node/Express

```js
const response = await fetch("http://localhost:8000/understand", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: whatsappMessage })
});
if (!response.ok) throw new Error(`AI service failed: ${response.status}`);
const aiDraft = await response.json();

// IMPORTANT: validate product names against YOUR Supabase catalogue.
// Do not let the model set prices or directly change stock.
// Send aiDraft to the user as a preview and wait for an explicit confirmation.
```

For audio, send the downloaded audio bytes as multipart form data to `/transcribe`.

## 5. Your model/data contribution

- Save consented, anonymized examples as `data/business_intents.jsonl`.
- Each line should be one JSON object: `{"text":"...","expected":{...}}`.
- Collect shopkeeper corrections; treat reviewed corrections as labelled data.
- Keep a held-out test set from different speakers. Track intent accuracy, product/quantity/unit exact match, and JSON validity.
- Do not call this a fine-tuned model yet. This starter uses a pretrained speech model and pretrained LLM through an API. Fine-tuning comes after you have a clean labelled dataset.

## Safety / production checklist

- Never expose `GROQ_API_KEY` in React/Vite or the browser.
- Do not send customer phone numbers or personal data unless necessary and consented.
- AI output is an untrusted draft, not an instruction to execute.
- Check shop ownership and permissions in Node/Supabase.
- Ask for clarification when the product or quantity is ambiguous.
- Confirm before inventory/order/payment mutations.
- A customer's statement that they paid is not proof that a payment was received.
