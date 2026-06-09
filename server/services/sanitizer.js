const sanitizeHtml = require('sanitize-html');

const sanitizeText = (str) => {
    if (!str) return '';
    return sanitizeHtml(String(str), { allowedTags: [], allowedAttributes: {} }).trim();
};

module.exports = { sanitizeText };
