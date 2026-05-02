const API_URL = "http://127.0.0.1:5000/api";

function getToken() {
    return localStorage.getItem("slotsy_token");
}

function setToken(token) {
    localStorage.setItem("slotsy_token", token);
}

function getUser() {
    const userStr = localStorage.getItem("slotsy_user");
    return userStr ? JSON.parse(userStr) : null;
}

function setUser(user) {
    localStorage.setItem("slotsy_user", JSON.stringify(user));
}

function logout() {
    localStorage.removeItem("slotsy_token");
    localStorage.removeItem("slotsy_user");
    window.location.href = "index.html";
}

async function apiCall(endpoint, method = "GET", body = null) {
    const headers = {
        "Content-Type": "application/json"
    };

    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || "An error occurred");
        }
        
        return data.data || data; // Return data payload or full response
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}
