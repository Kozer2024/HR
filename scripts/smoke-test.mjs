const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";
const routes = ["/", "/login", "/register"];
for (const route of routes) { const response = await fetch(`${baseUrl}${route}`); if (!response.ok) throw new Error(`${route}: ${response.status}`); console.log(`${route}: ${response.status}`); }
console.log("Smoke test passed");
