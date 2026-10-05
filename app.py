from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app) # stops the CORS error when frontend aur backend alag ports par run ho rahe hain

# Database Connection Helper
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="vyapar_sangam_db",
        user="postgres",
        password="2006" 
    )
    return conn

# 1. Base Route (Check karne ke liye ki server chal raha hai)
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Vyapar Sangam Backend is Running!"})

# 2. Get All Businesses (Payal iska use karke frontend par dukaano ki list dikhayegi)
@app.route('/businesses', methods=['GET'])
def get_businesses():
    try:
        conn = get_db_connection()
        # RealDictCursor data ko directly JSON format me convert kar deta hai
        cur = conn.cursor(cursor_factory=RealDictCursor) 
        cur.execute("SELECT * FROM Businesses WHERE status = 'Funding Open';")
        businesses = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(businesses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Save New Investment (Jab user form bharkar submit karega)
@app.route('/invest', methods=['POST'])
def invest():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Trades table me data insert karna
        cur.execute(
            "INSERT INTO Trades (investor_id, business_id, invested_amount) VALUES (%s, %s, %s)",
            (data['investor_id'], data['business_id'], data['amount'])
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "success", "message": "Investment Successfully Saved!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':

    app.run(debug=True, port=5000)