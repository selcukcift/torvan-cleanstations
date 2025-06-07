const { parseJSONBody } = require('../lib/requestUtils');
const { generateBOMForOrder } = require('../services/bomService');

async function handleGenerateBom(req, res) {
    try {
        const orderData = await parseJSONBody(req);
        if (!orderData || !orderData.customer || !orderData.configurations || !orderData.buildNumbers) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Invalid order data provided.' }));
            return;
        }

        const bom = await generateBOMForOrder(orderData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bom));
    } catch (error) {
        console.error('Error generating BOM:', error);        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error generating BOM', error: error.message }));
    }
}

module.exports = {
    handleGenerateBom,
};
