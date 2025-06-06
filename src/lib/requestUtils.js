// Helper functions for handling HTTP requests and responses

/**
 * Parses the JSON body from a request.
 * @param {http.IncomingMessage} req - The request object.
 * @returns {Promise<object>} A promise that resolves with the parsed JSON object.
 * @throws {Error} If the request body is not valid JSON.
 */
async function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Sends a JSON response.
 * @param {http.ServerResponse} res - The response object.
 * @param {number} statusCode - The HTTP status code.
 * @param {object} data - The data to send in the response body.
 */
function sendJSONResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Parses form data from a request.
 * (Basic implementation, can be expanded for multipart/form-data)
 * @param {http.IncomingMessage} req - The request object.
 * @returns {Promise<object>} A promise that resolves with the parsed form data.
 */
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
      return reject(new Error('Content-Type not application/x-www-form-urlencoded'));
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body);
        const formData = {};
        for (const [key, value] of params) {
          formData[key] = value;
        }
        resolve(formData);
      } catch (error) {
        reject(new Error('Invalid form data'));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  parseJSONBody,
  sendJSONResponse,
  parseFormData,
};
