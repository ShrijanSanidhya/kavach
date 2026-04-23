export function startListening(onResult, onEnd, language = "hi-IN") {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice not supported in this browser. Use Chrome.");
    return null;
  }
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = language;

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript).join("");
    onResult(transcript, event.results[event.results.length - 1].isFinal);
  };

  recognition.onend = () => { if (onEnd) onEnd(); };
  recognition.onerror = (e) => console.error("Speech error:", e);
  recognition.start();
  return recognition;
}