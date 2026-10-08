from flask import Flask, jsonify
from flask_cors import CORS
from routes import api_routes

app = Flask(__name__)
CORS(app)

app.register_blueprint(api_routes)


@app.route('/')
def home():
  return jsonify(
    {'message': 'Vyapar Sangam Backend is running successfully!'}
  )


if __name__ == '__main__':
  app.run(debug=True, port=5000)