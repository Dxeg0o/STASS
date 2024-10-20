from firebase_functions import https_fn
from firebase_admin import initialize_app
from app import app  # Importa tu aplicación Flask desde app.py

initialize_app()  # Inicializa la aplicación de Firebase

@https_fn.on_request()
def firebase_functions_handler(request: https_fn.Request) -> https_fn.Response:
    # Convierte el objeto Request de Firebase Functions al formato de Flask
    with app.request_context(request.environ):
        # Llama a tu aplicación Flask y obtiene la respuesta
        response = app.full_dispatch_request()
        # Convierte la respuesta de Flask al formato de Firebase Functions
        return https_fn.Response(
            response=response.get_data(),
            status=response.status_code,
            headers=dict(response.headers)
        )
