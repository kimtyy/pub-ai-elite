const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env key safely
let apiKey = '';
try {
    const envData = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const match = envData.match(/GOOGLE_VISION_API_KEY=(.*)/);
    if (match) apiKey = match[1].trim();
} catch (e) { console.error("Error reading .env:", e); }

const PORT = 3000;

const server = http.createServer((req, res) => {
    // 1. Static File Serving (Mimicking 'serve')
    let filePath = '.' + req.url;
    if (filePath == './') filePath = './index.html';
    
    // 2. OCR API Proxy Handling
    if (req.url === '/api/ocr' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { image } = JSON.parse(body);
                const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

                const googleRequest = JSON.stringify({
                    requests: [{
                        image: { content: base64Image },
                        features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
                    }]
                });

                const options = {
                    hostname: 'vision.googleapis.com',
                    path: `/v1/images:annotate?key=${apiKey}`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                };

                const gReq = https.request(options, (gRes) => {
                    let gData = '';
                    gRes.on('data', d => gData += d);
                    gRes.on('end', () => {
                        const result = JSON.parse(gData);
                        const fullText = result.responses[0]?.fullTextAnnotation?.text || "텍스트를 찾을 수 없습니다.";
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, fullText }));
                    });
                });

                gReq.on('error', (e) => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, details: e.message }));
                });

                gReq.write(googleRequest);
                gReq.end();

            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, details: "Invalid request payload" }));
            }
        });
        return;
    }

    // Static Asset Serving Logic
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end("File not found");
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 PUB AI v7.0 Elite Proxy Server running at http://localhost:${PORT}/`);
});
