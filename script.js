// Backend se businesses (dukaanein) fetch karne ka function
async function loadBusinesses() {
    try {
        const response = await fetch('http://127.0.0.1:5000/businesses');
        const data = await response.json();
        
        console.log("Database se aaya data:", data);
        
        // Agar listings.html me koi container hai, toh wahan data dikhayenge
        const container = document.getElementById('business-list');
        if (container) {
            container.innerHTML = ""; // Pehle ka content saaf karein
            data.forEach(b => {
                container.innerHTML += `
                    <div style="border: 1px solid #ccc; padding: 15px; margin: 10px; border-radius: 5px; background: #fff;">
                        <h3>${b.shop_name}</h3>
                        <p><strong>Category:</strong> ${b.category}</p>
                        <p><strong>City:</strong> ${b.city}</p>
                        <p><strong>Description:</strong> ${b.description}</p>
                        <p><strong>Asking Price:</strong> ₹${b.asking_price}</p>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("Backend se data laane me error aaya:", error);
    }
}

// Jab page load ho, tab yeh function chal jaye
window.onload = function() {
    loadBusinesses();
};