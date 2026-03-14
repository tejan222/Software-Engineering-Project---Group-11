console.log("JS loaded!")

// SIGN UP
async function signupUser(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    try {
        const response = await fetch("http://localhost:3000/api/auth/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email,
                password,
                confirmPassword
            })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Signup error:", error);
        alert("Could not connect to backend.");
    }
}

// LOGIN
async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Could not connect to backend.");
    }
}

// LOGOUT
async function logoutUser() {
    try {
        const response = await fetch("http://localhost:3000/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("Could not connect to backend.");
    }
}

// SHOW LOGIN STATUS ON INDEX PAGE
async function checkLoginStatus() {
    const statusElement = document.getElementById("authStatus");
    const logoutButton = document.getElementById("logoutButton");
    const loginButton = document.getElementById("loginButton");
    const signupButton = document.getElementById("signupButton");

    if (!statusElement) {
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/api/auth/me", {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (response.ok) {
            statusElement.textContent = `Logged in as: ${data.user.email}`;

            if (logoutButton) {
                logoutButton.style.display = "inline-block";
            }
            if (loginButton) {
                loginButton.style.display = "none";
            }
            if (signupButton) {
                signupButton.style.display = "none";
            }
        } else {
            statusElement.textContent = "Not logged in.";

            if (logoutButton) {
                logoutButton.style.display = "none";
            }
            if (loginButton) {
                loginButton.style.display = "inline-block";
            }
            if (signupButton) {
                signupButton.style.display = "inline-block";
            }
        }
    } catch (error) {
        console.error("Login status error:", error);
        statusElement.textContent = "Could not connect to backend.";
    }
}

document.addEventListener("DOMContentLoaded", checkLoginStatus);