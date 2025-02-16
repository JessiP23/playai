const express = require('express');
const cors = require('cors');
// dropdown voice aget
const voices = require('./voices/list-voices.js');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

const PLAYAI_API_KEY = 'ak-c3eaeadb838944cfaec82e41129a71f3';
const PLAYAI_USER_ID = '5jcbndHqeMg9yRPw95Ti5cVfNus2';

app.get('/api/voices', (req, res) => {
    res.json(voices);
});

app.post('/api/text-to-speech', async (req, res) => {
    try {
        const { text, voice } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Text content is required' });
        }

        if (!voice || !voice.value) {
            return res.status(400).json({ error: 'Voice configuration is required' });
        }

        const options = {
            method: 'POST',
            headers: {
                'AUTHORIZATION': 
                PLAYAI_API_KEY,
                'X-USER-ID': PLAYAI_USER_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "PlayDialog",
                text: text,
                voice: voice.value,
                outputFormat: "mp3",
                speed: 1,
                sampleRate: 24000,
                language: "english"
            })
        };
        console.log('Text-to-speech request:', options);

        const response = await fetch('https://api.play.ai/api/v1/tts/stream', options);

        console.log('Text-to-speech response:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to generate audio');
        }

        const audioContent = await response.buffer();
        res.setHeader('Content-Type', 'audio/mp3');
        res.send(audioContent);
    } catch (error) {
        console.error('Text-to-speech error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to generate audio',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});