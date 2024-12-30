const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

router.post('/', async (req, res) => {
    const { code, input } = req.body;
    if (!code) {
        return res.json({ 
            success: false, 
            error: 'No code provided' 
        });
    }

    const filename = uuidv4();
    const filepath = path.join(__dirname, '../temp');
    const sourceFile = path.join(filepath, `${filename}.py`);

    try {
        fs.writeFileSync(sourceFile, code);
        
        // Use pty.js to create pseudo-terminal for interactive I/O
        const pythonProcess = spawn('python3', [sourceFile], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let outputBuffer = '';
        let errorBuffer = '';
        let isWaitingForInput = false;
        let inputPrompt = '';

        pythonProcess.stdout.on('data', (data) => {
            const text = data.toString();
            
            // Store the input prompt separately
            if (text.includes('input') || text.endsWith(': ') || text.endsWith('? ')) {
                inputPrompt = text;
                isWaitingForInput = true;
                // Don't add prompt to output buffer yet
            } else {
                outputBuffer += text;
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            errorBuffer += data.toString();
        });

        if (input) {
            // When input is provided, show both prompt and input
            pythonProcess.stdin.write(input + '\n');
            outputBuffer = inputPrompt + input + '\n' + outputBuffer;
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
            isWaitingForInput,
            inputPrompt: isWaitingForInput ? inputPrompt : null
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
