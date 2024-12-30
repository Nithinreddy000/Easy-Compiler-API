const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

router.post('/', async (req, res) => {
    const { code, input } = req.body;
    if (!code) {
        return res.status(400).json({ 
            success: false, 
            error: 'No code provided' 
        });
    }

    const filename = uuidv4();
    const filepath = path.join(__dirname, '../temp');

    if (!fs.existsSync(filepath)) {
        fs.mkdirSync(filepath);
    }

    const sourceFile = path.join(filepath, `${filename}.py`);

    try {
        fs.writeFileSync(sourceFile, code);

        const pythonProcess = spawn('python3', [sourceFile]);
        let outputBuffer = '';
        let errorBuffer = '';
        let isWaitingForInput = false;

        pythonProcess.stdout.on('data', (data) => {
            const text = data.toString();
            outputBuffer += text;
            
            // Check for input prompts
            if (text.includes('input') || text.endsWith('? ') || text.endsWith(': ')) {
                isWaitingForInput = true;
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            errorBuffer += data.toString();
        });

        if (input) {
            pythonProcess.stdin.write(input + '\n');
            pythonProcess.stdin.end();
        }

        const exitCode = await new Promise((resolve) => {
            pythonProcess.on('close', resolve);
        });

        fs.unlinkSync(sourceFile);

        if (exitCode !== 0 && !isWaitingForInput) {
            return res.json({
                success: false,
                error: errorBuffer || 'Program exited with error',
                output: outputBuffer
            });
        }

        return res.json({
            success: true,
            output: outputBuffer,
            error: errorBuffer,
            isWaitingForInput
        });

    } catch (error) {
        if (fs.existsSync(sourceFile)) {
            fs.unlinkSync(sourceFile);
        }

        return res.json({
            success: false,
            error: error.toString()
        });
    }
});

module.exports = router;
