const {
    isValidEmail,
    hasSpecialCharacter,
    normalizeEmail,
    validateSignupInput
} = require("../authValidation");

describe("authValidation", () => {
    describe("isValidEmail", () => {
        it("returns true for a valid email", () => {
            expect(isValidEmail("user@example.com")).toBeTrue();
        });

        it("returns false for an email missing @", () => {
            expect(isValidEmail("userexample.com")).toBeFalse();
        });

        it("returns false for an email missing domain", () => {
            expect(isValidEmail("user@")).toBeFalse();
        });

        it("returns false for non-string input", () => {
            expect(isValidEmail(null)).toBeFalse();
        });
    });

    describe("hasSpecialCharacter", () => {
        it("returns true when password contains a special character", () => {
            expect(hasSpecialCharacter("Password!")).toBeTrue();
        });

        it("returns false when password has no special character", () => {
            expect(hasSpecialCharacter("Password123")).toBeFalse();
        });

        it("returns false for non-string input", () => {
            expect(hasSpecialCharacter(undefined)).toBeFalse();
        });
    });

    describe("normalizeEmail", () => {
        it("converts email to lowercase", () => {
            expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
        });

        it("trims surrounding spaces", () => {
            expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
        });


        it("returns empty string for non-string input", () => {
            expect(normalizeEmail(null)).toBe("");
        });
    });

    describe("validateSignupInput", () => {
        it("rejects missing fields", () => {
            expect(validateSignupInput("", "Password!", "Password!"))
                .toBe("All fields are required.");
        });

        it("rejects invalid email", () => {
            expect(validateSignupInput("bademail", "Password!", "Password!"))
                .toBe("Please enter a valid email address.");
        });

        it("rejects mismatched passwords", () => {
            expect(validateSignupInput("user@example.com", "Password!", "Different!"))
                .toBe("Passwords do not match.");
        });

        it("rejects passwords without a special character", () => {
            expect(validateSignupInput("user@example.com", "Password123", "Password123"))
                .toBe("Password must contain at least one special character.");
        });

        it("accepts valid signup input", () => {
            expect(validateSignupInput("user@example.com", "Password!", "Password!"))
                .toBeNull();
        });
    });
});