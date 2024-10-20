from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import numpy as np
from sklearn.decomposition import PCA
import matplotlib
matplotlib.use('Agg')  # Establece el backend no interactivo
import matplotlib.pyplot as plt
import io
import base64
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

        try:
            points = np.array([[p["x"], p["y"]] for p in data["predictions"][0]["points"]])
        except KeyError:
            return jsonify({'error': 'Formato de datos incorrecto'}), 400

        # Realiza PCA
        pca = PCA(n_components=2)
        pca.fit(points)
        principal_components = pca.components_
        mean_point = pca.mean_

        # Cálculo de la altura y el ancho máximo
        principal_component = principal_components[0]  # Dirección principal
        secondary_component = principal_components[1]  # Dirección secundaria
        projected = pca.transform(points)
        projected_primary = projected[:, 0]
        min_index = np.argmin(projected_primary)
        max_index = np.argmax(projected_primary)
        point_min = points[min_index]
        point_max = points[max_index]
        altura = np.linalg.norm(point_max - point_min)
        print(f"La altura del espárrago es: {altura}")

        # Cálculo del ancho máximo
        num_segments = 100
        min_proj = projected_primary.min()
        max_proj = projected_primary.max()
        segment_length = (max_proj - min_proj) / num_segments
        max_width = 0
        width_indices = None
        for i in range(num_segments):
            start = min_proj + i * segment_length
            end = start + segment_length
            indices = np.where((projected_primary >= start) & (projected_primary < end))[0]
            if len(indices) > 1:
                proj_sec = projected[indices, 1]
                width = proj_sec.max() - proj_sec.min()
                if width > max_width:
                    max_width = width
                    width_indices = indices[np.argmin(proj_sec)], indices[np.argmax(proj_sec)]

        radio = max_width / 2
        print(f"El radio (ancho máximo / 2) del espárrago es: {radio}")

        # Genera el gráfico
        plt.figure(figsize=(10, 8))
        plt.plot(points[:, 0], points[:, 1], 'o', markersize=2, label='Puntos del espárrago')
        plt.plot([point_min[0], point_max[0]], [point_min[1], point_max[1]], 'r-', linewidth=2, label='Altura calculada')
        if width_indices is not None:
            point_min_width = points[width_indices[0]]
            point_max_width = points[width_indices[1]]
            plt.plot([point_min_width[0], point_max_width[0]], [point_min_width[1], point_max_width[1]], 'g-', linewidth=2, label='Ancho máximo')
        plt.legend()
        plt.title('Cálculo de Altura y Ancho Máximo del Espárrago')
        plt.xlabel('X')
        plt.ylabel('Y')
        plt.axis('equal')
        img = io.BytesIO()
        plt.savefig(img, format='png')
        img.seek(0)
        plot_data = base64.b64encode(img.read()).decode()
        plt.close()

        result = {
            'altura': altura,
            'radio': radio,
            'grafico': plot_data
        }
        return jsonify(result)

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
