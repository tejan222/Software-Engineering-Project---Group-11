const {
    normalizeLoginInput,
    userAlreadyExists,
    loginUserExists
} = require("../authHelpers");

describe("authHelpers", () => {
    describe("normalizeLoginInput", () => {
        it("converts uppercase email to lowercase", () => {
            expect(normalizeLoginInput("User@Example.COM"))
                .toBe("user@example.com");
        });

        it("trims surrounding spaces", () => {
            expect(normalizeLoginInput("  user@example.com  "))
                .toBe("user@example.com");
        });

        it("returns empty string for null input", () => {
            expect(normalizeLoginInput(null)).toBe("");
        });
    });

    describe("userAlreadyExists", () => {
        it("returns true when a database row exists", () => {
            expect(userAlreadyExists({ id: 1, email: "user@example.com" }))
                .toBeTrue();
        });

        it("returns false when no database row exists", () => {
            expect(userAlreadyExists(undefined)).toBeFalse();
        });

        it("returns false when row is null", () => {
            expect(userAlreadyExists(null)).toBeFalse();
        });
    });

    describe("loginUserExists", () => {
        it("returns true when a user record exists", () => {
            expect(loginUserExists({ id: 2, email: "user@example.com" }))
                .toBeTrue();
        });

        it("returns false when a user record does not exist", () => {
            expect(loginUserExists(undefined)).toBeFalse();
        });

        it("returns false when user is null", () => {
            expect(loginUserExists(null)).toBeFalse();
        });
    });
});