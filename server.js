const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Simple CORS configuration to allow all origins
app.use(cors());

// Make sure this comes before your routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Testing routers
app.get('/', (req, res) => {
    res.send("API IS RUNNING")
})

// C++ Router
app.use('/api', require('./api/cppApi'));

// Python Router
app.use('/api/python', require('./api/pythonApi'));

// Java Router
app.use('/api/java', require('./api/javaApi'))

// Serve static files
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
