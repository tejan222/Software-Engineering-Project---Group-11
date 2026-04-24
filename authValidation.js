function isValidEmail(email) {
    if (typeof email !== "string") {
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function hasSpecialCharacter(password) {
    if (typeof password !== "string") {
        return false;
    }

    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return specialCharRegex.test(password);
}

function normalizeEmail(email) {
    if (typeof email !== "string") {
        return "";
    }

    return email.toLowerCase().trim();
}

function validateSignupInput(email, password, confirmPassword) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || !confirmPassword) {
        return "All fields are required.";
    }

    if (!isValidEmail(normalizedEmail)) {
        return "Please enter a valid email address.";
    }

    if (password !== confirmPassword) {
        return "Passwords do not match.";
    }

    if (!hasSpecialCharacter(password)) {
        return "Password must contain at least one special character.";
    }

    return null;
}

module.exports = {
    isValidEmail,
    hasSpecialCharacter,
    normalizeEmail,
    validateSignupInput
};