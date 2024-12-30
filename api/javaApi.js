const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

router.post('/', async (req, res) => {
    const { code, input } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    const filename = uuidv4();
    const filepath = path.join(__dirname, '../temp');

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(filepath)) {
        fs.mkdirSync(filepath);
    }

    const sourceFile = path.join(filepath, 'Main.java');

    try {
        // Write the code to a file
        fs.writeFileSync(sourceFile, code);

        // Compile the code
        await new Promise((resolve, reject) => {
            exec(`javac "${sourceFile}"`, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr);
                    return;
                }
                resolve(stdout);
            });
        });

        // Run the code with spawn to handle interactive input
        const javaProcess = spawn('java', ['-cp', filepath, 'Main']);
        let output = '';
        let error = '';

        // Handle program output
        javaProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        // Handle program errors
        javaProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        // If there's input, write it to the process
        if (input) {
            javaProcess.stdin.write(input);
            javaProcess.stdin.end();
        }

        // Wait for the process to complete
        await new Promise((resolve, reject) => {
            javaProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(error || 'Process exited with non-zero code');
                } else {
                    resolve();
                }
            });
        });

        // Clean up
        fs.unlinkSync(sourceFile);
        fs.unlinkSync(path.join(filepath, 'Main.class'));

        res.json({ 
            success: true, 
            output: output || '',
            error: error || ''
        });

    } catch (error) {
        // Clean up on error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(path.join(filepath, 'Main.class'))) {
            fs.unlinkSync(path.join(filepath, 'Main.class'));
        }

        res.json({ 
            success: false, 
            error: error.toString() 
        });
    }
});

module.exports = router;
