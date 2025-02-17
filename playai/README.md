# PDF Reader Pro

A modern web application that converts PDF documents to speech using Play.ai's text-to-speech API. Features include page-by-page navigation, voice selection, and optimized audio chunk processing.

## Key Features

- 📄 PDF upload and viewing with page navigation
- 🎧 Text-to-speech conversion with multiple voice options  
- 💨 Optimized PDF compression and caching
- 🎯 Chunk-based audio processing for better performance
- 🎨 Modern, responsive UI design

## Technologies Used

### Frontend
- **Next.js 13+** - React framework for building the UI
- **Tailwind CSS** - Utility-first CSS framework for styling
- **react-pdf** - PDF rendering library
- **react-dropzone** - File upload handling

### Backend
- **Express.js** - Node.js web application framework
- **node-cache** - Caching for audio chunks
- **pdf-lib** - PDF manipulation
- **pako** - Compression algorithm for PDF data
- **Play.ai API** - Text-to-speech service

## Design Decisions

- **AVL Tree Structure**: Used for efficient PDF page storage and retrieval with O(log n) complexity
- **Chunk-based Processing**: Text split into 25-word chunks for smoother audio playback
- **Caching System**: Implemented audio caching to reduce API calls and improve performance
- **Compression**: PDF compression to optimize storage and loading times
- **Component Architecture**: Modular design for better maintainability and code reuse

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/JessiP23/playai.git
cd playai
```
2. Install dependencies:
```bash
npm install 
```

3. Set up environment variables: Create a .env file in the root directory:
```bash
PLAYAI_API_KEY=your_api_key
PLAYAI_USER_ID=your_user_id
PORT=3001
```

4. Start the development servers:
Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
cd backend
npm install
node server.js
```

5. Open http://localhost:3000 in your browser
