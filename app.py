from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="vyapar_sangam_db",
        user="postgres",
        password="2006" 
    )
    return conn

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Vyapar Sangam Acquisition Backend is Running!"})

# 1. API: Saari bikne wali dukaanein dikhane ke liye (Buyer ke liye)
@app.route('/businesses', methods=['GET'])
def get_businesses():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM Businesses WHERE status = 'For Sale';")
        businesses = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(businesses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. API: Nayi dukaan bechne ke liye list karna (Seller ke liye)
@app.route('/add-business', methods=['POST'])
def add_business():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            """INSERT INTO Businesses 
            (owner_id, shop_name, category, city, description, asking_price) 
            VALUES (%s, %s, %s, %s, %s, %s)""",
            (data['owner_id'], data['shop_name'], data['category'], data['city'], data['description'], data['asking_price'])
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "success", "message": "Business successfully listed for sale!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. API: Dukaan kharidne ka offer save karna (Buyer ke liye)
@app.route('/buy-business', methods=['POST'])
def buy_business():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            "INSERT INTO Acquisitions (buyer_id, business_id, offer_amount) VALUES (%s, %s, %s)",
            (data['buyer_id'], data['business_id'], data['offer_amount'])
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "success", "message": "Business purchase offer submitted successfully!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)