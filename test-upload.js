const express = require("express");
const app = express();

app.post("/api/admin/games/upload", (req, res) => {
    console.log("Test upload hit");
    res.json({ success: true });
});

app.get("/test", (req, res) => {
    res.json({ message: "Server is running" });
});

console.log("Starting test server...");
app.listen(4000, () => {
    console.log("Test server on port 4000");
    console.log("Routes registered:");
    if (app._router && app._router.stack) {
        app._router.stack.forEach(r => {
            if (r.route) console.log(r.route.stack[0].method.toUpperCase() + " " + r.route.path);
        });
    }
});
