const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
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

    const sourceFile = path.join(filepath, `${filename}.py`);

    try {
        // Write the code to a file
        fs.writeFileSync(sourceFile, code);

        // Run the code with spawn to handle interactive input
        const pythonProcess = spawn('python3', [sourceFile]);
        let outputBuffer = '';
        let currentOutput = '';
        let isWaitingForInput = false;

        // Handle program output
        pythonProcess.stdout.on('data', (data) => {
            const text = data.toString();
            outputBuffer += text;
            currentOutput = outputBuffer;
            
            // If we detect an input prompt, send partial output
            if (text.includes('input') || text.includes('?') || text.endsWith(': ')) {
                isWaitingForInput = true;
                res.write(JSON.stringify({ 
                    partial: true, 
                    output: currentOutput 
                }) + '\n');
            }
        });

        // Handle program errors
        pythonProcess.stderr.on('data', (data) => {
            outputBuffer += data.toString();
        });

        // If there's input, write it to the process
        if (input) {
            pythonProcess.stdin.write(input + '\n');
            pythonProcess.stdin.end();
        }

        // Wait for the process to complete
        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code !== 0 && !isWaitingForInput) {
                    reject(outputBuffer || 'Process exited with non-zero code');
                } else {
                    resolve();
                }
            });
        });

        // Clean up
        fs.unlinkSync(sourceFile);

        // Send final output
        res.json({ 
            success: true, 
            output: outputBuffer,
            isWaitingForInput
        });

    } catch (error) {
        // Clean up on error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);

        res.json({ 
            success: false, 
            error: error.toString() 
        });
    }
});

module.exports = router;
