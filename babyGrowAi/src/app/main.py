from fastapi import FastAPI

app = FastAPI(title="baby-grow-ai", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "baby-grow-ai"}