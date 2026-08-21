'use client';

import { useState, useRef, useCallback, useEffect, FormEvent } from 'react';

const STORAGE_KEY = 'eduportal_chat_history';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Base64 image data
  pdfText?: string; // Extracted PDF text
}

function loadMessages(): Message[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export default function ChatTutor() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: 'image' | 'pdf'; data: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setSelectedFile(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const optimizeImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; // Good balance for AI clarity
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75)); // Compress to JPEG 75%
      };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          // Optimize image to avoid Vercel's 4.5MB payload limit
          const optimized = await optimizeImage(base64);
          setSelectedFile({ name: file.name, type: 'image', data: optimized });
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
              'pdfjs-dist/build/pdf.worker.min.mjs',
              import.meta.url,
            ).toString();

            const arrayBuffer = reader.result as ArrayBuffer;
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Limit to first 10 pages for speed/token limits
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\n';
            }

            setSelectedFile({ name: file.name, type: 'pdf', data: fullText });
            setIsLoading(false);
          } catch (err) {
            console.error('PDF Extraction Error:', err);
            setError("Failed to extract text from PDF. Please try a different file.");
            setIsLoading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setError("Only images and PDFs are supported.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Error processing file.");
      setIsLoading(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !selectedFile) || isLoading) return;

    setError(null);
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed || (selectedFile ? `Analyze this ${selectedFile.type}` : ""),
      image: selectedFile?.type === 'image' ? selectedFile.data : undefined,
      pdfText: selectedFile?.type === 'pdf' ? selectedFile.data : undefined
    };
    const assistantMessage: Message = { id: `a-${Date.now()}`, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);
    scrollToBottom();

    // Build the messages array for the API
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
      image: m.image,
      pdfText: m.pdfText
    }));

    try {
      abortRef.current = new AbortController();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      // Parse SSE stream from OpenRouter
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream available.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + delta };
                }
                return updated;
              });
              scrollToBottom();
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Remove the empty assistant message on failure
      setMessages(prev => prev.filter(m => m.id !== assistantMessage.id));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, scrollToBottom, selectedFile]);

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'}`} />
          <h2 className="text-sm font-bold text-white tracking-widest uppercase">Oqool Academy AI Tutor</h2>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="text-[10px] text-amber-400/80 font-bold tracking-widest uppercase animate-pulse">Thinking...</span>
          )}
          {messages.length > 0 && !isLoading && (
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-all"
              title="Clear chat history"
              aria-label="Clear chat history"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <p className="text-sm font-medium text-white mb-2">How can I help you study today?</p>
            <p className="text-xs text-gray-400 max-w-sm">Ask me any question about your courses, homework, or provide a photo/PDF for me to analyze.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-lg backdrop-blur-md whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-emerald-600/20 text-emerald-100 border border-emerald-500/30'
                    : 'bg-white/5 text-gray-200 border border-white/10'
                }`}
              >
                {m.image && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-white/10 shadow-md">
                    <img src={m.image} alt="User upload" className="max-w-full h-auto max-h-60 object-cover" />
                  </div>
                )}
                {m.pdfText && (
                  <div className="mb-3 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate uppercase tracking-widest">Document Attached</p>
                      <p className="text-[10px] text-gray-400 truncate uppercase tracking-tighter">Content extracted for AI analysis</p>
                    </div>
                  </div>
                )}
                {m.content || (m.role === 'assistant' && isLoading ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : m.content)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-900/40 border border-red-500/60 rounded-xl text-red-200 text-sm backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <strong className="text-red-400">⚠ Error:</strong> {error}
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-black/50 border-t border-white/10 z-10">
        {/* File Preview Overlay */}
        {selectedFile && (
          <div className="mb-3 relative inline-block">
            {selectedFile.type === 'image' ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-[0_0_15px_rgba(8,75,43,0.4)]">
                <img src={selectedFile.data} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white/5 border-2 border-red-500 flex flex-col items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-[8px] font-bold mt-1 tracking-tighter uppercase truncate w-full text-center px-1">PDF</span>
              </div>
            )}
            <button
              onClick={removeSelectedFile}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-400 transition-colors z-20"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-14 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner backdrop-blur-sm transition-all"
              value={input}
              placeholder={selectedFile ? `Explain this ${selectedFile.type}...` : "Type your question..."}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all z-10 ${selectedFile ? (selectedFile.type === 'pdf' ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10') : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
              title="Attach an image or PDF"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedFile)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white transition-all shadow-[0_0_15px_rgba(8,75,43,0.4)] z-10"
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
