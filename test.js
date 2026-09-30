const http = require('http'); 
const req = http.request('http://127.0.0.1:3005/api/auth/login', { 
    method: 'POST', 
    headers: {'Content-Type': 'application/json'} 
}, (res) => { 
    let data = ''; 
    res.on('data', chunk => data += chunk); 
    res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data)); 
}); 
req.write(JSON.stringify({email: 'admin@varejopro.com', password: 'admin'})); 
req.end();
