const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

let latestBedPosition = { head: 0, thigh: 0, toe: 0, hug: 0 };

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/api/bed-position', (req, res) => {
    res.json([latestBedPosition]);
});

app.post('/api/bed-position', (req, res) => {
    latestBedPosition = req.body;
    console.log('Received position update:', latestBedPosition);
    res.json({ status: 'success', received: latestBedPosition });
});

app.listen(PORT, () => {
    console.log(`Server is running at port: ${PORT}`);
});