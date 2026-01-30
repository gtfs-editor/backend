import fs from 'fs';

async function testRegister() {
    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test_register@test.com',
                username: 'test_register',
                password: 'Password123!',
                first_name: 'Test',
                last_name: 'User'
            })
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Body length:', text.length);
        fs.writeFileSync('error_log.txt', text);
    } catch (err) {
        console.error('Request failed:', err);
    }
}

testRegister();
