// authValidation.test.js - Jasmine unit tests for Auth Validation

const {
    isValidEmail,
    hasSpecialCharacter,
    normalizeEmail,
    validateSignupInput
} = require('../../backend/authValidation');

describe("Auth Validation", () => {
    
    describe("isValidEmail", () => {
        it("should return true for valid email addresses", () => {
            expect(isValidEmail("test@example.com")).toBe(true);
            expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
            expect(isValidEmail("test+filter@gmail.com")).toBe(true);
        });
        
        it("should return false for invalid email addresses", () => {
            expect(isValidEmail("invalid")).toBe(false);
            expect(isValidEmail("missing@domain")).toBe(false);
            expect(isValidEmail("@missing.com")).toBe(false);
            expect(isValidEmail("")).toBe(false);
            expect(isValidEmail(null)).toBe(false);
            expect(isValidEmail(123)).toBe(false);
        });
        
        it("should reject emails with spaces", () => {
            expect(isValidEmail("test@example.com ")).toBe(false);
            expect(isValidEmail(" test@example.com")).toBe(false);
        });
    });
    
    describe("hasSpecialCharacter", () => {
        it("should return true for passwords with special characters", () => {
            expect(hasSpecialCharacter("password!")).toBe(true);
            expect(hasSpecialCharacter("pass@word")).toBe(true);
            expect(hasSpecialCharacter("pass#123")).toBe(true);
            expect(hasSpecialCharacter("pass$word")).toBe(true);
            expect(hasSpecialCharacter("pass%word")).toBe(true);
        });
        
        it("should return false for passwords without special characters", () => {
            expect(hasSpecialCharacter("password123")).toBe(false);
            expect(hasSpecialCharacter("Password")).toBe(false);
            expect(hasSpecialCharacter("")).toBe(false);
        });
        
        it("should handle non-string inputs", () => {
            expect(hasSpecialCharacter(null)).toBe(false);
            expect(hasSpecialCharacter(undefined)).toBe(false);
            expect(hasSpecialCharacter(123)).toBe(false);
        });
    });
    
    describe("normalizeEmail", () => {
        it("should convert email to lowercase", () => {
            expect(normalizeEmail("Test@Example.com")).toBe("test@example.com");
            expect(normalizeEmail("USER@DOMAIN.COM")).toBe("user@domain.com");
        });
        
        it("should trim whitespace from email", () => {
            expect(normalizeEmail("  test@example.com  ")).toBe("test@example.com");
            expect(normalizeEmail(" test@example.com ")).toBe("test@example.com");
        });
        
        it("should return empty string for invalid input", () => {
            expect(normalizeEmail(null)).toBe("");
            expect(normalizeEmail(undefined)).toBe("");
            expect(normalizeEmail(123)).toBe("");
        });
    });
    
    describe("validateSignupInput", () => {
        it("should return null for valid signup data", () => {
            const result = validateSignupInput(
                "test@example.com",
                "password!123",
                "password!123"
            );
            expect(result).toBeNull();
        });
        
        it("should return error for missing fields", () => {
            expect(validateSignupInput("", "pass", "pass")).toBe("All fields are required.");
            expect(validateSignupInput("test@example.com", "", "pass")).toBe("All fields are required.");
            expect(validateSignupInput("test@example.com", "pass", "")).toBe("All fields are required.");
        });
        
        it("should return error for invalid email", () => {
            const result = validateSignupInput(
                "invalid-email",
                "password!123",
                "password!123"
            );
            expect(result).toBe("Please enter a valid email address.");
        });
        
        it("should return error for password mismatch", () => {
            const result = validateSignupInput(
                "test@example.com",
                "password1!",
                "password2!"
            );
            expect(result).toBe("Passwords do not match.");
        });
        
        it("should return error for missing special character in password", () => {
            const result = validateSignupInput(
                "test@example.com",
                "password123",
                "password123"
            );
            expect(result).toBe("Password must contain at least one special character.");
        });
    });
});