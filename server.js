const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/api', (req, res) => {
    res.json({ message: 'Hello from the server!' });
})

app.listen(PORT, () => {
    console.log(`Server is running at port: ${PORT}`);
});