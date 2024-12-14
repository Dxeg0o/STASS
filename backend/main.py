import os

# Configurar credenciales de Google Vision
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "./keys/stass.json"

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from google.cloud import vision
from google.cloud.vision_v1.types import AnnotateImageResponse

# Crear cliente de Vision
try:
    client = vision.ImageAnnotatorClient()
    print("Google Vision Client initialized successfully.")
except Exception as e:
    print(f"Error initializing Google Vision Client: {e}")

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir solicitudes desde tu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageData(BaseModel):
    image: str  # Imagen en formato base64

@app.post("/analyze")
async def analyze_image(data: ImageData):
    try:
        # Log para depuración
        print("Image received (first 100 chars):", data.image[:100])

        # Decodificar la imagen base64
        image_data = base64.b64decode(data.image)

        # Crear objeto de imagen para Google Vision
        image = vision.Image(content=image_data)

        # Analizar la imagen usando Google Vision (detección de etiquetas como ejemplo)
        response: AnnotateImageResponse = client.label_detection(image=image)
        print(response)
        
        # Procesar las etiquetas detectadas
        if not response.label_annotations:
            return {"labels": [], "message": "No labels detected"}

        labels = [
            {"description": label.description, "score": round(label.score, 2)}
            for label in response.label_annotations
        ]

        # Retornar etiquetas como resultado
        return {"labels": labels}

    except Exception as e:
        # Log para depuración en caso de error
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")
