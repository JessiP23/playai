'use client';

import { useState, useEffect, useRef, use } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Loading from "./Loading";
import AudioControl from "./Audio";
import PdfCompress from "../services/Compress";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function chunkText(text, chunkSize = 10) {
  const words = text.split(/\s+/);
  let chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  return chunks;
}

function ViewPdf({ pdfData }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState(null);
  const [audioCache, setAudioCache] = useState({});

  // pass audio control features
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [pageText, setPageText] = useState('');
  const [chunks, setChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [chunkCache, setChunkCache] = useState({});

  async function loadPdfContent() {
    if (!pdfData) return;
    try {
      setLoading(true);
      setError(null);
      const node = pdfData.tree?.search(pdfData.tree.root, pageNumber);
      if (node) {
        const decompressedContent = await PdfCompress.decompressPdf(node.data);
        const blob = new Blob([decompressedContent], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setContent(url);
      }
    } catch (err) {
      console.error("Error loading PDF page:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (content) {
        URL.revokeObjectURL(content);
      }
    };
  }, [content]);

  useEffect(() => {
    loadPdfContent();
  }, [pageNumber, pdfData]);

  useEffect(() => {
    async function fetchVoices() {
      try {
        const response = await fetch('http://localhost:3001/api/voices');
        const voiceData = await response.json();
        setVoices(voiceData);
        setSelectedVoice(voiceData[0]);
      } catch (error) {
        console.error('Error fetching voices:', error);
      }
    }
    fetchVoices();
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  function nextPage() {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  }

  function prevPage() {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  }

  const extractTextFromPage = async (page) => {
    try {
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ').trim();
      setPageText(text);
      const textChunks = chunkText(text, 10);
      setChunks(textChunks);
      setCurrentChunkIndex(0);
      return text;
    } catch (error) {
      // Warning: AbortException: TextLayer task cancelled.
      if (error.name === "AbortException") {
        // Ignore AbortException as it is expected during quick navigation or unmount.
        console.warn("Text extraction aborted:", error.message);
      } else {
        console.error("Error extracting text:", error);
      }
      return "";
    }
  };

  // pass audio for a chunk of text
  const fetchChunkAudio = async (chunk) => {
    const cacheKey = `${chunk}-${selectedVoice.value}`;
    if (chunkCache[cacheKey]) return chunkCache[cacheKey];

    const response = await fetch('http://localhost:3001/api/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: chunk,
        voice: selectedVoice,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate audio for chunk');
    }
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    setChunkCache(prev => ({ ...prev, [cacheKey]: audioUrl }));
    return audioUrl;
  };

  // Modify the handlePlayPause function
  const handlePlayPause = async (play) => {
    if (play) {
      try {
        if (!pageText) throw new Error('No text content available');
        if (!selectedVoice) throw new Error('No voice selected');
        setLoading(true);
        setIsPlaying(true);

        // If audio is already loaded, resume playback (no reset currentTime).
        if (audioRef.current.src) {
          await audioRef.current.play();
          // play immediately next chunks of words
          const nextChunkOfWords = currentChunkIndex + 1;

          if (nextChunkOfWords < chunks.length) {
            const nextChunk = chunks[nextChunkOfWords];
            const cacheKey = `${nextChunk}-${selectedVoice.value}`;

            if (!chunkCache[cacheKey]) {
              fetchChunkAudio(nextChunk);
            }
          }

          setLoading(false);
          return;
        }

        const currentChunk = chunks[currentChunkIndex];
        if (!currentChunk) throw new Error('No text chunk available');
        const audioUrlForChunk = await fetchChunkAudio(currentChunk);
        audioRef.current.src = audioUrlForChunk;
        await audioRef.current.play();

        // play immediately next chunks of words
        const nextChunkOfWords = currentChunkIndex + 1;
        if (nextChunkOfWords < chunks.length) {
          const nextChunk = chunks[nextChunkOfWords];
          const cacheKey = `${nextChunk}-${selectedVoice.value}`;
          if (!chunkCache[cacheKey]) {
            fetchChunkAudio(nextChunk);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        alert(error.message);
        setIsPlaying(false);
      } finally {
        setLoading(false);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  };

  const handleChunkEnd = async () => {
    const nextIndex = currentChunkIndex + 1;
    if (nextIndex < chunks.length) {
      const nextChunk = chunks[nextIndex];
      const cacheKey = `${nextChunk}-${selectedVoice.value}`;
      let nextAudioUrl = chunkCache[cacheKey];
      if (!nextAudioUrl) {
        // If prefetching did not complete, fetch now.
        nextAudioUrl = await fetchChunkAudio(nextChunk);
      }
      audioRef.current.src = nextAudioUrl;
      setCurrentChunkIndex(nextIndex);
      await audioRef.current.play();
      // Prefetch the subsequent chunk to keep audio seamless.
      const followingIndex = nextIndex + 1;
      if (followingIndex < chunks.length) {
        const followingChunk = chunks[followingIndex];
        const followingCacheKey = `${followingChunk}-${selectedVoice.value}`;
        if (!chunkCache[followingCacheKey]) {
          fetchChunkAudio(followingChunk);
        }
      }
    } else {
      // All chunks played - reset playback if desired.
      setCurrentChunkIndex(0);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = handleChunkEnd;
    }
  }, [chunks, currentChunkIndex]);

  // Update voice selection handler remains similar; you might wish to reset audio when voice changes.
  const handleVoiceChange = (e) => {
    const voice = voices.find(v => v.name === e.target.value);
    setSelectedVoice(voice);
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.src = ''; // force re-fetch of audio using new voice.
    }
  };

  useEffect(() => {
    if (pageText && selectedVoice && chunks.length > 0 && !audioRef.current.src) {
      const currentChunk = chunks[currentChunkIndex];
      const cacheKey = `${currentChunk}-${selectedVoice.value}`;
      if (!chunkCache[cacheKey]) {
        fetch('http://localhost:3001/api/text-to-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: currentChunk,
            voice: selectedVoice
          }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error('Prefetch failed');
            const audioBlob = await response.blob();
            const prefetchUrl = URL.createObjectURL(audioBlob);
            setChunkCache(prev => ({ ...prev, [cacheKey]: prefetchUrl }));
          })
          .catch(console.error);
      }
    }
  }, [pageText, selectedVoice, chunks, currentChunkIndex]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-black">
      {/* Zoom controls */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex space-x-2">
          <button
            onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            -
          </button>
          <button
            onClick={() => setScale((prev) => Math.min(prev + 0.1, 2.0))}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            +
          </button>
          <span className="px-2 py-1">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <Loading />
        ) : (
          <Document
            file={content}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<Loading />}
            className="flex justify-center"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onLoadSuccess={async (page) => {
                await extractTextFromPage(page);
              }}
            />
          </Document>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between p-4 border-t bg-white">
        <button
          onClick={prevPage}
          disabled={pageNumber <= 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Previous
        </button>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center gap-2">
            <span>Page {pageNumber} of {numPages}</span>
            <AudioControl
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
            />
          </div>
          <audio
            ref={audioRef}
            hidden
          />
          <input
            type="number"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (value >= 1 && value <= (numPages || 1)) {
                setPageNumber(value);
              }
            }}
            className="w-16 px-2 py-1 border rounded"
          />
          <select 
            value={selectedVoice?.name || ''}
            onChange={handleVoiceChange}
            className="border rounded px-2 py-1"
          >
            {voices.map(voice => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.accent})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={nextPage}
          disabled={pageNumber >= (numPages || 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}


export default ViewPdf;