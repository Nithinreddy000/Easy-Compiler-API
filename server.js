const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
    'https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--c8c182a3.local-credentialless.webcontainer.io',
    'http://localhost:5173',
    // add other origins as needed
];

// CORS configuration
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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
