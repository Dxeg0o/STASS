from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import numpy as np
from sklearn.decomposition import PCA
from firebase_functions import https_fn
from firebase_admin import initialize_app, get_app

# Inicializa Firebase Admin solo si no está ya inicializado
try:
    get_app()
except ValueError:
    initialize_app()

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas las rutas

@app.route('/api/calculate', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
def calculate():
    if request.method == 'POST':
        data = request.get_json()
        if not data or 'predictions' not in data or not data['predictions']:
            return jsonify({'error': 'Datos inválidos'}), 400

        results = []
        
        # Iteramos sobre todas las predicciones en los datos
        for prediction in data['predictions']:
            try:
                points = np.array([[p["x"], p["y"]] for p in prediction["points"]])
            except KeyError:
                return jsonify({'error': 'Formato de datos incorrecto'}), 400

            # Realiza PCA
            pca = PCA(n_components=2)
            pca.fit(points)
            principal_components = pca.components_

            # Cálculo de la altura
            projected = pca.transform(points)
            projected_primary = projected[:, 0]
            min_index = np.argmin(projected_primary)
            max_index = np.argmax(projected_primary)
            point_min = points[min_index]
            point_max = points[max_index]
            altura = np.linalg.norm(point_max - point_min)

            # Cálculo del ancho máximo (radio)
            num_segments = 100
            min_proj = projected_primary.min()
            max_proj = projected_primary.max()
            segment_length = (max_proj - min_proj) / num_segments
            max_width = 0
            for i in range(num_segments):
                start = min_proj + i * segment_length
                end = start + segment_length
                indices = np.where((projected_primary >= start) & (projected_primary < end))[0]
                if len(indices) > 1:
                    proj_sec = projected[indices, 1]
                    width = proj_sec.max() - proj_sec.min()
                    if width > max_width:
                        max_width = width

            radio = max_width / 2

            # Agrega el resultado al arreglo de resultados
            results.append({
                'detection_id': prediction.get('detection_id'),
                'altura': altura,
                'radio': radio
            })

        return jsonify({'results': results})

    elif request.method == 'GET':
        return jsonify({'message': 'Endpoint para cálculos. Utiliza POST para enviar datos.'}), 200
    else:
        return jsonify({'error': 'Método no soportado'}), 405

# Firebase Functions handler
@https_fn.on_request()
def firebase_functions_handler(request: https_fn.Request) -> https_fn.Response:
    with app.request_context(request.environ):
        response = app.full_dispatch_request()
        return https_fn.Response(
            response=response.get_data(),
            status=response.status_code,
            headers=dict(response.headers)
        )
