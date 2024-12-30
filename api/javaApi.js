const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
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
    const inputFile = path.join(filepath, `${filename}.txt`);

    try {
        // Write the code to a file
        fs.writeFileSync(sourceFile, code);
        if (input) {
            fs.writeFileSync(inputFile, input);
        }

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

        // Run the code
        const output = await new Promise((resolve, reject) => {
            let command = `java -cp "${filepath}" Main`;
            if (input) {
                command = `java -cp "${filepath}" Main < "${inputFile}"`;
            }
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr);
                    return;
                }
                resolve(stdout);
            });
        });

        // Clean up
        fs.unlinkSync(sourceFile);
        fs.unlinkSync(path.join(filepath, 'Main.class'));
        if (input) {
            fs.unlinkSync(inputFile);
        }

        res.json({ success: true, output });

    } catch (error) {
        // Clean up on error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(path.join(filepath, 'Main.class'))) {
            fs.unlinkSync(path.join(filepath, 'Main.class'));
        }
        if (input && fs.existsSync(inputFile)) fs.unlinkSync(inputFile);

        res.json({ success: false, error: error.toString() });
    }
});

module.exports = router;
