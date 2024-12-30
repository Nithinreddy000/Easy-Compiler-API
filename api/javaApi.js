const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
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

    if (!fs.existsSync(filepath)) {
        fs.mkdirSync(filepath);
    }

    const sourceFile = path.join(filepath, 'Main.java');
    const classFile = path.join(filepath, 'Main.class');

    try {
        fs.writeFileSync(sourceFile, code);

        // Compile Java code
        try {
            await new Promise((resolve, reject) => {
                exec(`javac "${sourceFile}"`, (error, stdout, stderr) => {
                    if (error) reject(stderr);
                    else resolve(stdout);
                });
            });
        } catch (compileError) {
            return res.json({
                success: false,
                error: compileError.toString(),
                isCompileError: true
            });
        }

        const javaProcess = spawn('java', ['-cp', filepath, 'Main']);
        let outputBuffer = '';
        let errorBuffer = '';
        let isWaitingForInput = false;

        javaProcess.stdout.on('data', (data) => {
            const text = data.toString();
            outputBuffer += text;
            
            // Check for input prompts
            if (text.endsWith(': ') || text.endsWith('? ') || text.includes('Scanner')) {
                isWaitingForInput = true;
            }
        });

        javaProcess.stderr.on('data', (data) => {
            errorBuffer += data.toString();
        });

        if (input) {
            javaProcess.stdin.write(input + '\n');
            javaProcess.stdin.end();
        }

        const exitCode = await new Promise((resolve) => {
            javaProcess.on('close', resolve);
        });

        // Cleanup
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(classFile)) fs.unlinkSync(classFile);

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
        // Cleanup on error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(classFile)) fs.unlinkSync(classFile);

        return res.json({
            success: false,
            error: error.toString()
        });
    }
});

module.exports = router;
