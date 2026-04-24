// cucumber.js - Updated version without paths in config
module.exports = {
    default: {
        require: ['tests/acceptance/steps/*.js'],
        format: [
            'progress-bar',
            'json:reports/cucumber-report.json',
            'html:reports/cucumber-report.html'
        ],
        // Remove the 'paths' line - let CLI handle it
        // paths: ['tests/acceptance/features/'],  // ← DELETE THIS LINE
        timeout: 60000,
        parallel: 1
    }
};