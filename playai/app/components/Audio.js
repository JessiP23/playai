 'use client';

 import { useRef, useState } from "react";

 function AudioControl({ pageContent, pageNumber, isPlaying, onPlayPause }) {
    const [loading, setLoading] = useState(false);
    const audioRef = useRef(null);

    const handlePlayPause = async () => {
        try {
            setLoading(true);
            await onPlayPause(!isPlaying, pageContent);
        } catch (error) {
            console.error('Error playing audio:', error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <span>Page {pageNumber}</span>
            <button
                onClick={handlePlayPause}
                disabled={loading}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
                aria-label={isPlaying ? 'Stop' : 'Play'}
            >
                {loading ? (
                    <span className="animate-spin">⌛</span>
                ) : isPlaying ? (
                    <span>⏹️</span>
                ) : (
                    <span>▶️</span>
                )}
            </button>
        </div>
    );
}

export default AudioControl;