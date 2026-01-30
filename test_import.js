
import fs from 'fs';
import path from 'path';

async function run() {
    const baseUrl = 'http://localhost:3000/api';
    const filePath = '/Users/fahmifachrizal/Projects/gtfs/gtfs-fe/public/transjakarta.zip';

    try {
        console.log("1. Logging in with m.fahmi.fachrizal@gmail.com...");
        const email = "m.fahmi.fachrizal@gmail.com";
        const password = "A1b2C3d4!";

        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        const loginData = await loginRes.json();
        const token = loginData.data?.token || loginData.token;
        console.log("Login successful. Token acquired.");

        console.log("2. Creating Project...");
        const timestamp = Date.now();
        const projectName = `Curl Test ${timestamp}`;
        const createRes = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: projectName, type: 'import', description: 'Test from script' })
        });

        if (!createRes.ok) throw new Error(`Create failed: ${createRes.status} ${await createRes.text()}`);
        const projectRes = await createRes.json();
        const project = projectRes.project;

        if (!project || !project.id) {
            console.error("Project creation response:", projectRes);
            throw new Error("Project ID missing in response");
        }

        console.log(`Project created: ${project.id} (${project.name})`);

        console.log("3. Uploading GTFS File...");
        if (!fs.existsSync(filePath)) throw new Error("File not found: " + filePath);
        const fileBuffer = fs.readFileSync(filePath);

        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'application/zip' });
        formData.append('file', blob, 'transjakarta.zip');

        const importRes = await fetch(`${baseUrl}/projects/${project.id}/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!importRes.ok) {
            console.error(`Import failed status: ${importRes.status}`);
            const errorText = await importRes.text();
            console.error("Error body:", errorText);
            throw new Error("Import failed");
        }

        const importData = await importRes.json();
        console.log("Import Success Response:", JSON.stringify(importData, null, 2));

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

run();
