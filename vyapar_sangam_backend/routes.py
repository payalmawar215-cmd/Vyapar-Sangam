from db import get_db_connection
from flask import Blueprint, jsonify, request

api_routes = Blueprint('api_routes', __name__)


# 1. Saari dukaanein fetch karne ke liye route
@api_routes.route('/businesses', methods=['GET'])
def get_businesses():
  try:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        'SELECT business_id, shop_name, category, city, description,'
        ' asking_price FROM businesses;'
    )
    businesses = cur.fetchall()
    cur.close()
    conn.close()

    business_list = []
    for b in businesses:
      business_list.append({
          'business_id': b[0],
          'shop_name': b[1],
          'category': b[2],
          'city': b[3],
          'description': b[4],
          'asking_price': float(b[5]),
      })

    return jsonify(business_list), 200
  except Exception as e:
    return jsonify({'error': str(e)}), 500


# 2. Naya business add karne ke liye route
@api_routes.route('/add-business', methods=['POST'])
def add_business():
  try:
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        'INSERT INTO businesses (shop_name, category, city, description,'
        ' asking_price) VALUES (%s, %s, %s, %s, %s)',
        (
            data['shop_name'],
            data['category'],
            data['city'],
            data['description'],
            data['asking_price'],
        ),
    )
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'message': 'Business added successfully!'}), 201
  except Exception as e:
    return jsonify({'error': str(e)}), 500


# 3. NDA Sign karne ke liye route
@api_routes.route('/sign-nda', methods=['POST'])
def sign_nda():
  try:
    data = request.json
    user_id = data.get('user_id')
    business_id = data.get('business_id')

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        'INSERT INTO ndas (user_id, business_id, status) VALUES (%s, %s,'
        " 'Signed')",
        (user_id, business_id),
    )
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'message': 'NDA signed successfully!'}), 201
  except Exception as e:
    return jsonify({'error': str(e)}), 500