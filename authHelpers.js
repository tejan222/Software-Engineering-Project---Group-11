const { normalizeEmail } = require("./authValidation");

function normalizeLoginInput(email) {
    return normalizeEmail(email);
}

function userAlreadyExists(row) {
    return !!row;
}

function loginUserExists(user) {
    return !!user;
}

module.exports = {
    normalizeLoginInput,
    userAlreadyExists,
    loginUserExists
};