const express = require('express');
const cors = require('cors');
// dropdown voice aget
const voices = require('./voices/list-voices.js');
const NodeCache = require('node-cache');
const https = require('https');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const agent = new https.Agent({keepAlive: true});
// audio takes so long to load
// cache audio for 1 hour
// 60 sec = 1 min
// 60 min = 1 hour
// 60 * 60 = 3600 sec
const cacheAudio = new NodeCache({stdTTL: 3600});

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

        // cache temporarily text and audio
        const cacheKey = `${text}-${voice.value}`;
        const cachedAudio = cacheAudio.get(cacheKey);

        if (cachedAudio) {
            res.setHeader('Content-Type', 'audio/mp3');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.send(cachedAudio);
        }

        const options = {
            method: 'POST',
            headers: {
                'Authorization': 
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
            }),
            // persistence 
            agent
        };
        console.log('Text-to-speech request:', options);


        // use PlayAI API to generate audio
        const response = await fetch('https://api.play.ai/api/v1/tts/stream', options);

        console.log('Text-to-speech response:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to generate audio');
        }

        const audioContent = await response.buffer();

        cacheAudio.set(cacheKey, audioContent);
        res.setHeader('Content-Type', 'audio/mp3');
        res.setHeader('Cache-Control', 'public, max-age=3600');
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