'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page } from "react-pdf";
import Loading from "./Loading";
import AudioControl from "./Audio";
import PdfCompress from "../services/Compress";
import { pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css'; 

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// options to prevent to flicker pdf 
const PDF_OPTIONS = {
  cMapUrl: 'cmaps/',
  cMapPacked: true,
  disableAutoFetch: true,
  disableStream: true,
}

function chunkText(text, chunkSize = 25) { 
  const words = text.split(/\s+/).filter(word => word.length > 0); // Filter empty strings
  let chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ').trim();

    // filter empty strings
    if (chunk) chunks.push(chunk); 
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
  const [showNotification, setShowNotification] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  // pass audio control features
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [pageText, setPageText] = useState('');
  const [chunks, setChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [chunkCache, setChunkCache] = useState({});

  const loadPdfContent = useCallback(async () => {
    if (!pdfData?.tree) return;
    
    try {
      setLoading(true);
      setError(null);
      const node = pdfData.tree.search(pdfData.tree.root, pageNumber);
      if (node) {
        const decompressedContent = await PdfCompress.decompressPdf(node.data);
        const blob = new Blob([decompressedContent], { type: 'application/pdf' });
        setContent(blob);
      }
    } catch (err) {
      console.error("Error loading PDF page:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pdfData?.tree, pageNumber]);

  useEffect(() => {
    loadPdfContent();
  }, [loadPdfContent]);

  const handleLoadSuccess = useCallback(async (page) => {
    try {
      const extractedText = await extractTextFromPage(page);

      if (!extractedText) {
        console.warn('No text extracted from the page');
        return;
      }
      console.log('Successfulle extracted text:', extractedText);
    } catch (error) {
      console.error('Error extracting text:', error);
    }
  }, []);

  // Memoize the Document onLoadSuccess callback
  const handleDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
  }, []);

  const PdfViewer = useCallback(() => (
    <Document
      file={content}
      onLoadSuccess={handleDocumentLoadSuccess}
      loading={<Loading />}
      className="flex justify-center"
      options={PDF_OPTIONS}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={true}
        renderAnnotationLayer={true}
        onLoadSuccess={handleLoadSuccess}
      />
    </Document>
  ), [content, pageNumber, scale, handleLoadSuccess, handleDocumentLoadSuccess]);

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

  const extractTextFromPage = async (page) => {
    try {
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ').trim();
      console.log('Text extraction stats:', {
        totalLength: text.length,
        firstFewWords: text.substring(0, 50) + '...'
      });
  
      if (!text) {
        console.warn('Extracted text is empty');
        return '';
      }
      setPageText(text);
      const textChunks = chunkText(text, 25);
      console.log('Chunk statistics:', {
        numberOfChunks: textChunks.length,
        firstChunkLength: textChunks[0]?.length || 0,
        averageChunkLength: textChunks.reduce((acc, chunk) => acc + chunk.length, 0) / textChunks.length
      });
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
  
    try {
      console.log('Sending chunk:', { 
        chunkLength: chunk.length, 
        chunk: chunk.substring(0, 50) + '...',
        voice: selectedVoice.name 
      });
      const response = await fetch('http://localhost:3001/api/text-to-speech', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          text: chunk,
          voice: selectedVoice,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }
      
      const blob = await response.blob();
      console.log("Received blob:", {
        size: blob.size,
        type: blob.type,
      })
      if (blob.size === 0) {
        throw new Error('Empty audio response');
      }
      
      const audioUrl = URL.createObjectURL(new Blob([blob], { type: 'audio/mp3' }));
      setChunkCache(prev => ({ ...prev, [cacheKey]: audioUrl }));
      return audioUrl;
    } catch (error) {
      console.error('Audio fetch error:', error);
      throw error;
    }
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
    try {
      const nextIndex = currentChunkIndex + 1;
      
      // Clean up current audio URL
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
  
      if (nextIndex < chunks.length) {
        const nextChunk = chunks[nextIndex];
        const cacheKey = `${nextChunk}-${selectedVoice.value}`;
        
        try {
          const nextAudioUrl = chunkCache[cacheKey] || await fetchChunkAudio(nextChunk);
          
          if (!audioRef.current) return;
          
          audioRef.current.src = nextAudioUrl;
          setCurrentChunkIndex(nextIndex);
          
          const playPromise = audioRef.current.play();
          if (playPromise) {
            await playPromise;
          }
  
          // Prefetch next chunk
          const followingIndex = nextIndex + 1;
          if (followingIndex < chunks.length) {
            const followingChunk = chunks[followingIndex];
            const followingCacheKey = `${followingChunk}-${selectedVoice.value}`;
            if (!chunkCache[followingCacheKey]) {
              fetchChunkAudio(followingChunk).catch(console.error);
            }
          }
        } catch (error) {
          console.error('Audio playback error:', error);
          setIsPlaying(false);
        }
      } else {
        if (audioRef.current) {
          audioRef.current.src = '';
        }
        setCurrentChunkIndex(0);
        setIsPlaying(false);

        setShowNotification(true);

        // if autoadvance is enabled, move to the next page
        if (autoAdvance && pageNumber < numPages) {
          setTimeout(() => {
            // move to next page
            setPageNumber(prev => prev + 1);
            setShowNotification(false);

            setTimeout(() => handlePlayPause(true), 1000);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Chunk end error:', error);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup audio resources on unmount
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current.src = '';
      }
      // Cleanup cached audio URLs
      Object.values(chunkCache).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);
  
  // Update the audio setup effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = handleChunkEnd;
      audioRef.current.onerror = (e) => {
        console.error('Audio error:', e);
        setIsPlaying(false);
      };
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
      <div className="flex-1 overflow-auto p-4 relative">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : (
          <PdfViewer />
        )}

{showNotification && (
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 z-10 border border-gray-200 w-80">
            <div className="flex flex-col items-center">
              <p className="text-gray-800 mb-3">Audio playback finished</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowNotification(false)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Close
                </button>
                {pageNumber < numPages && (
                  <button 
                    onClick={() => {
                      setPageNumber(prev => prev + 1);
                      setShowNotification(false);
                      // Optional: auto-play the next page after navigation
                      setTimeout(() => handlePlayPause(true), 500);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Next Page
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between p-4 border-t bg-white">
        <button
          onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
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
            <div className="flex items-center ml-2">
              <input
                type="checkbox"
                id="autoAdvance"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="autoAdvance" className="text-sm text-gray-700">
                Auto-advance pages
              </label>
            </div>
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
          onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || 1))}
          disabled={pageNumber >= (numPages || 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Next
        </button>
      </div>
      {/* <PdfDoc /> */}
    </div>
  );
}


export default ViewPdf;