import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Code, Brain, Users, Award, ExternalLink, MessageSquare, Sparkles, Zap, Volume2, Workflow } from 'lucide-react';

// ✅ ÚNICO CAMBIO 1: Video en lugar de imagen SVG
const AVATAR_VIDEO_URL = "./avatar-carla.mp4";

const PortafolioCarDev = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playingMessageIndex, setPlayingMessageIndex] = useState(null);
  const [playingVoiceMode, setPlayingVoiceMode] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const shouldStopRecognition = useRef(false);

  useEffect(() => {
    // Scroll solo dentro del contenedor del chat, NO toda la página
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // CONTINUO: Graba sin detenerse por silencios
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Error de reconocimiento de voz:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          alert('Por favor, permite el acceso al micrófono en la configuración del navegador.');
        }
      };

      recognitionRef.current.onend = () => {
        // Simplemente detener - NO reiniciar automáticamente
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }

    if (isListening) {
      // Usuario presionó "Detener" - marcar que SÍ queremos detener
      shouldStopRecognition.current = true;
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Usuario presionó "Iniciar" - marcar que NO queremos detener
      shouldStopRecognition.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error al iniciar:', error);
        alert('Error al iniciar el micrófono. Verifica los permisos.');
        setIsListening(false);
      }
    }
  };

  const speak = async (text, messageIndex, voiceMode) => {
    try {
      // Si ya está reproduciendo ESTE mensaje con ESTE modo, pausar
      if (playingMessageIndex === messageIndex && playingVoiceMode === voiceMode) {
        // Detener todo
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setPlayingMessageIndex(null);
        setPlayingVoiceMode(null);
        setIsGeneratingAudio(false);
        return;
      }

      // Si hay otro audio reproduciéndose, detenerlo
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      setPlayingMessageIndex(messageIndex);
      setPlayingVoiceMode(voiceMode);

      // MODO 1: Voz del navegador (rápida)
      if (voiceMode === 'browser') {
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoices = [
          'Google español',
          'Microsoft Helena',
          'Mónica',
          'Paulina',
          'Google español de Estados Unidos',
          'Microsoft Laura'
        ];
        
        utterance.voice = voices.find(voice => 
          preferredVoices.some(pref => voice.name.includes(pref))
        );
        
        if (!utterance.voice) {
          utterance.voice = voices.find(voice => voice.lang.startsWith('es'));
        }
        
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.1;
        
        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
          setPlayingMessageIndex(null);
          setPlayingVoiceMode(null);
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
          setPlayingMessageIndex(null);
          setPlayingVoiceMode(null);
        };
        
        window.speechSynthesis.speak(utterance);
      } 
      // MODO 2: Voz Premium ElevenLabs
      else if (voiceMode === 'premium') {
        setIsGeneratingAudio(true);
        setIsSpeaking(true);

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text })
        });

        if (!response.ok) {
          throw new Error('Error generating audio');
        }

        const data = await response.json();
        setIsGeneratingAudio(false);
        
        const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          setPlayingMessageIndex(null);
          setPlayingVoiceMode(null);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          setPlayingMessageIndex(null);
          setPlayingVoiceMode(null);
          setIsGeneratingAudio(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };
        
        await audio.play();
      }
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
      setPlayingMessageIndex(null);
      setPlayingVoiceMode(null);
      setIsGeneratingAudio(false);
    }
  };

  // Función helper para convertir Base64 a Blob
  const base64ToBlob = (base64, contentType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }
    
    return new Blob([new Uint8Array(byteArrays)], { type: contentType });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => `${m.role === 'user' ? 'Visitante' : 'Yo'}: ${m.content}`).join('\n');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Eres Carla Pamela Molina Jerez hablando en PRIMERA PERSONA. Estás en tu portafolio conversacional haciendo una "entrevista" bidireccional con un visitante potencial (recruiter, cliente, empresa).

TU OBJETIVO: Responder sus preguntas Y hacer preguntas estratégicas para entender qué buscan y cómo puedes ayudarles.

TU PERFIL:
- Soy Ingeniera en Computación especializada en IA aplicada y agentes conversacionales
- Experta en LLMs, RAG y Model Context Protocol (MCP)
- 15 años de experiencia como docente con certificación Experto 1
- 2-3 años coordinando equipos de hasta 15 personas (apertura de proyectos PIE desde cero)
- Fundadora de Mentor-IA: desarrollo de agentes conversacionales con IA
- Stack: Python, React, FastAPI, Streamlit, PostgreSQL, OpenAI/Claude APIs

MIS PROYECTOS:
1. Agente InterSystems: Sistema RAG para inducción técnica en TrakCare. Arquitectura completa (FastAPI, Streamlit, PostgreSQL, Vector Store). Reduce curva de aprendizaje de 4-6 años.
2. Agente RRHH RAG: Automatización de consultas sobre vacaciones, evaluaciones, beneficios.
3. Electroconstrucción.cl: Desarrollo web completo para emprendimiento.

MIS SERVICIOS:
- Agentes conversacionales con IA (Mentor-IA)
- Consultoría en adopción de IA organizacional
- Desarrollo web e integración (desarrollo-web.cl)
- Análisis de comportamiento de usuarios

MI VENTAJA: Combino expertise técnico en IA con pedagogía (15 años enseñando). No solo construyo soluciones sino que capacito equipos en adopción tecnológica.

CÓMO RESPONDER:
1. Si es su primera pregunta: Responde Y pregunta qué está buscando o en qué proyecto está trabajando
2. Si ya conversaron: Construye sobre lo anterior, profundiza, sugiere soluciones
3. Habla natural, amigable, profesional (máximo 3-4 líneas)
4. Usa "Soy", "Tengo", "Desarrollé" (NUNCA "Carla es")
5. Si detectas interés real: Invita a contactarte por email o LinkedIn

CONVERSACIÓN PREVIA:
${conversationHistory}

NUEVA PREGUNTA: ${input}

Responde de forma conversacional y estratégica:`
            }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = {
        role: 'assistant',
        content: data.content[0].text
      };

      setMessages(prev => [...prev, assistantMessage]);
      // ✅ NO llamar a speak() automáticamente - el usuario decide con los botones
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Disculpa, tuve un problema al procesar tu pregunta. ¿Podrías intentarlo de nuevo?'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const HolographicAvatar = ({ size = 'large', isThinking = false, isTalking = false }) => {
    const dimension = size === 'large' ? 'w-72 h-72' : 'w-32 h-32';
    const videoRef = useRef(null);
    const [videoState, setVideoState] = useState('initial'); // 'initial', 'playing', 'paused', 'ended'
    
    // ✅ Control del video con botón
    const handleVideoControl = () => {
      if (!videoRef.current) return;
      
      if (videoState === 'initial' || videoState === 'ended') {
        // Reproducir desde el inicio
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(err => console.log('Video play error:', err));
        setVideoState('playing');
        
        // Detectar cuando termina
        videoRef.current.onended = () => {
          setVideoState('ended');
        };
      } else if (videoState === 'playing') {
        // Pausar
        videoRef.current.pause();
        setVideoState('paused');
      } else if (videoState === 'paused') {
        // Reanudar
        videoRef.current.play().catch(err => console.log('Video play error:', err));
        setVideoState('playing');
      }
    };
    
    // Determinar texto e icono del botón
    const getButtonContent = () => {
      if (videoState === 'initial') {
        return { text: 'Ver mi presentación', icon: 'play' };
      } else if (videoState === 'playing') {
        return { text: 'Pausar video', icon: 'pause' };
      } else if (videoState === 'paused') {
        return { text: 'Continuar video', icon: 'play' };
      } else if (videoState === 'ended') {
        return { text: 'Ver de nuevo', icon: 'replay' };
      }
    };
    
    const buttonContent = getButtonContent();
    
    return (
      <div className={`relative ${dimension}`}>
        <div className={`absolute inset-0 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 rounded-full blur-3xl opacity-40 ${isTalking ? 'animate-pulse' : ''}`}></div>
        <div className={`absolute inset-0 bg-cyan-400 rounded-full blur-2xl opacity-20 ${isTalking ? 'animate-pulse' : ''}`} style={{animationDelay: '0.3s'}}></div>
        
        <div className="relative w-full h-full">
          {/* ✅ Video se reproduce UNA vez al cargar, luego se detiene */}
          <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-cyan-400/50">
            <video 
              ref={videoRef}
              playsInline
              className="w-full h-full object-cover"
              style={{
                filter: 'brightness(1.2) contrast(1.1)',
                mixBlendMode: 'screen'
              }}
            >
              <source src={AVATAR_VIDEO_URL} type="video/mp4" />
            </video>
            
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/20 via-transparent to-cyan-500/20"></div>
            
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, 0.3) 25%, rgba(6, 182, 212, 0.3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.3) 75%, rgba(6, 182, 212, 0.3) 76%, transparent 77%, transparent),
                  linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, 0.3) 25%, rgba(6, 182, 212, 0.3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.3) 75%, rgba(6, 182, 212, 0.3) 76%, transparent 77%, transparent)
                `,
                backgroundSize: '20px 20px'
              }}
            ></div>
            
            <div className="absolute inset-0 overflow-hidden">
              <div 
                className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"
                style={{
                  animation: 'scan 3s linear infinite'
                }}
              ></div>
            </div>
            
            {isTalking && (
              <div 
                className="absolute inset-0 bg-cyan-400/10"
                style={{
                  animation: 'glitch 0.3s infinite'
                }}
              ></div>
            )}
          </div>
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 200">
            {[...Array(8)].map((_, i) => {
              const angle = (i * 360) / 8;
              const radius = 95;
              const x = 100 + radius * Math.cos((angle * Math.PI) / 180);
              const y = 100 + radius * Math.sin((angle * Math.PI) / 180);
              return (
                <circle key={i} cx={x} cy={y} r="2" fill="#06b6d4" opacity="0.6">
                  <animate
                    attributeName="r"
                    values="1;3;1"
                    dur="2s"
                    begin={`${i * 0.25}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur="2s"
                    begin={`${i * 0.25}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}
            
            <circle cx="100" cy="100" r="90" fill="none" stroke="url(#gradient1)" strokeWidth="1" opacity="0.3">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 100 100"
                to="360 100 100"
                dur="20s"
                repeatCount="indefinite"
              />
            </circle>
            
            <circle cx="100" cy="100" r="105" fill="none" stroke="url(#gradient2)" strokeWidth="0.5" opacity="0.2">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="360 100 100"
                to="0 100 100"
                dur="15s"
                repeatCount="indefinite"
              />
            </circle>
            
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          
          {isThinking && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-cyan-400 rounded-full"
                  style={{
                    animation: `bounce 0.6s ease-in-out ${i * 0.1}s infinite`
                  }}
                ></div>
              ))}
            </div>
          )}
          
          {isTalking && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-cyan-400 rounded-full"
                  style={{
                    height: '16px',
                    animation: `wave 0.6s ease-in-out ${i * 0.1}s infinite`
                  }}
                ></div>
              ))}
            </div>
          )}
        </div>
        
        {/* ✅ Botón de control de video - siempre visible */}
        <button
          onClick={handleVideoControl}
          className={`mt-8 bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-3 rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/50 transition flex items-center gap-2 mx-auto ${
            videoState === 'initial' ? 'animate-pulse' : ''
          }`}
        >
          {buttonContent.icon === 'play' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
          {buttonContent.icon === 'pause' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
            </svg>
          )}
          {buttonContent.icon === 'replay' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
            </svg>
          )}
          {buttonContent.text}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <nav className="relative z-10 px-6 py-4 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            CarDev
          </div>
          <div className="flex gap-6">
            <a href="#about" className="hover:text-cyan-400 transition">Sobre mí</a>
            <a href="#projects" className="hover:text-cyan-400 transition">Proyectos</a>
            <a href="#conversation" className="hover:text-cyan-400 transition">Conversemos</a>
            <a href="#contact" className="hover:text-cyan-400 transition">Contacto</a>
          </div>
        </div>
      </nav>

      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full text-cyan-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Ingeniera Full Stack • Especialista en IA Conversacional
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Carla Pamela
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Molina Jerez
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Construyo <span className="text-cyan-400 font-semibold">agentes conversacionales inteligentes</span> que transforman cómo las organizaciones acceden al conocimiento, automatizan procesos y capacitan equipos.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <Brain className="w-5 h-5 text-cyan-400" />
              <span>LLMs • RAG • MCP</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <Users className="w-5 h-5 text-purple-400" />
              <span>Arquitectura & Coordinación de Sistemas</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <Zap className="w-5 h-5 text-cyan-400" />
              <span>Pensamiento Analítico-Creativo</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#conversation"
              className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition"
            >
              Conversemos
            </a>
            <a
              href="#projects"
              className="border border-white/20 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/5 transition"
            >
              Ver proyectos
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold mb-12 text-center">
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Mi Ventaja Diferencial
          </span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-cyan-500/50 transition">
            <Brain className="w-12 h-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Cerebro Analítico-Creativo</h3>
            <p className="text-gray-300">
              Combino pensamiento lógico riguroso con creatividad infinita. Soluciono problemas complejos con soluciones innovadoras que otros no ven, manteniendo siempre la viabilidad técnica.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition">
            <Workflow className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Coordinación de Alta Complejidad</h3>
            <p className="text-gray-300">
              Articulación prolija de sistemas multi-componente y coordinación de equipos interdisciplinarios. Integro backend, frontend, bases de datos y APIs en soluciones coherentes
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-cyan-500/50 transition">
            <MessageSquare className="w-12 h-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Comunicación Técnica Clara</h3>
            <p className="text-gray-300">
              Traduzco complejidad técnica a lenguaje comprensible. Explico arquitecturas, flujos y decisiones técnicas de forma clara para stakeholders, clientes y equipos interdisciplinarios.
            </p>
          </div>
        </div>
      </section>

      <section id="projects" className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold mb-12 text-center">
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Proyectos Destacados
          </span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur-sm p-8 rounded-2xl border border-cyan-500/30 hover:border-cyan-500 transition group">
            <div className="bg-cyan-500/20 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <Brain className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Agente InterSystems</h3>
            <p className="text-gray-300 mb-6">
              Sistema conversacional con RAG para optimizar la inducción técnica en TrakCare. Arquitectura completa: FastAPI, Streamlit, PostgreSQL, Vector Store OpenAI. Reduce curva de aprendizaje de 4-6 años.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-cyan-500/20 rounded-full text-xs text-cyan-400">Python</span>
              <span className="px-3 py-1 bg-cyan-500/20 rounded-full text-xs text-cyan-400">RAG</span>
              <span className="px-3 py-1 bg-cyan-500/20 rounded-full text-xs text-cyan-400">PostgreSQL</span>
              <span className="px-3 py-1 bg-cyan-500/20 rounded-full text-xs text-cyan-400">OpenAI</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30 hover:border-purple-500 transition group">
            <div className="bg-purple-500/20 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <MessageSquare className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Agente RRHH RAG</h3>
            <p className="text-gray-300 mb-6">
              Demo funcional de automatización con RAG para consultas de recursos humanos. Responde preguntas sobre vacaciones, evaluaciones, beneficios y políticas empresariales con información contextualizada.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-purple-500/20 rounded-full text-xs text-purple-400">LLMs</span>
              <span className="px-3 py-1 bg-purple-500/20 rounded-full text-xs text-purple-400">RAG</span>
              <span className="px-3 py-1 bg-purple-500/20 rounded-full text-xs text-purple-400">Mentor-IA</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur-sm p-8 rounded-2xl border border-cyan-500/30 hover:border-cyan-500 transition group">
            <div className="bg-cyan-500/20 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <Code className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Electroconstrucción.cl</h3>
            <p className="text-gray-300 mb-6">
              Desarrollo web completo para emprendimiento del sector construcción. Diseño moderno, responsive y optimizado para conversión de clientes.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-cyan-500/20 rounded-full text-xs text-cyan-400">React</span>
              <span className="px-3 py-1 bg-cyan-500/20 rounded-full text-xs text-cyan-400">Web Design</span>
            </div>
          </div>
        </div>
      </section>

      <section id="conversation" className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Conversemos
            </span>
          </h2>
          <p className="text-gray-300 text-lg">
            Pregúntame sobre mi experiencia, proyectos y cómo puedo ayudarte. Puedes escribir o usar tu voz.
          </p>
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-8 items-start">
          <div className="flex flex-col items-center gap-6">
            <HolographicAvatar size="large" isThinking={isLoading} isTalking={isSpeaking} />
            <div className="text-center">
              <p className="text-cyan-400 font-semibold text-lg mb-1">Carla IA</p>
              <p className="text-gray-400 text-sm">
                {isLoading && '💭 Pensando...'}
                {isSpeaking && !isGeneratingAudio && '🔊 Reproduciendo...'}
                {isGeneratingAudio && '🎵 Generando voz clonada...'}
                {isListening && '🎤 Escuchando...'}
                {!isLoading && !isSpeaking && !isListening && !isGeneratingAudio && '✨ Lista para conversar'}
              </p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-xs text-gray-400 w-full">
              <p className="mb-2 text-cyan-400 font-semibold text-center">💡 Tip de voz</p>
              <p className="text-center">Cada respuesta tiene 2 opciones: <span className="text-white">⚡ Rápida</span> o <span className="text-cyan-400">🎙️ Premium</span></p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-2xl relative">
            <div ref={chatContainerRef} className="h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-32">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                  <p className="text-lg mb-2">¡Hola! Soy Carla</p>
                  <p className="text-sm">
                    Pregúntame sobre mi experiencia, proyectos o cómo puedo ayudarte con IA.
                  </p>
                  <div className="mt-6 text-left max-w-md mx-auto space-y-2 text-xs">
                    <p className="text-cyan-400">💡 Ejemplos de preguntas:</p>
                    <p>"¿Qué experiencia tienes con agentes conversacionales?"</p>
                    <p>"¿Puedes ayudarme a implementar IA en mi empresa?"</p>
                    <p>"Cuéntame sobre tu proyecto de InterSystems"</p>
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white p-4 rounded-2xl'
                        : 'bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 p-4">
                        {msg.content}
                      </div>
                      
                      {/* Botones de audio solo para mensajes de Carla */}
                      {msg.role === 'assistant' && (
                        <div className="flex flex-col gap-2 mt-4 mr-3">
                          {/* Botón Voz Rápida */}
                          <button
                            onClick={() => speak(msg.content, idx, 'browser')}
                            disabled={isGeneratingAudio && playingMessageIndex === idx}
                            className={`p-2 rounded-lg transition flex items-center gap-2 text-xs font-medium ${
                              playingMessageIndex === idx && playingVoiceMode === 'browser'
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                                : 'bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-white'
                            }`}
                            title="Voz rápida (navegador)"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>⚡</span>
                          </button>
                          
                          {/* Botón Voz Premium */}
                          <button
                            onClick={() => speak(msg.content, idx, 'premium')}
                            disabled={isGeneratingAudio && playingMessageIndex === idx}
                            className={`p-2 rounded-lg transition flex items-center gap-2 text-xs font-medium ${
                              isGeneratingAudio && playingMessageIndex === idx && playingVoiceMode === 'premium'
                                ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300'
                                : playingMessageIndex === idx && playingVoiceMode === 'premium'
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                                : 'bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-cyan-400'
                            }`}
                            title="Voz premium (mi voz clonada con IA)"
                          >
                            {isGeneratingAudio && playingMessageIndex === idx && playingVoiceMode === 'premium' ? (
                              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                            <span>🎙️</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-2xl">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Recording Panel - Similar to ChatGPT */}
            {isListening && (
              <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md">
                <div className="bg-gradient-to-r from-cyan-500/15 to-blue-500/15 backdrop-blur-xl border-2 border-cyan-400/60 rounded-2xl p-6 shadow-2xl shadow-cyan-500/20 animate-pulse-slow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-4 h-4 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
                        <div className="absolute inset-0 w-4 h-4 bg-cyan-400 rounded-full animate-ping"></div>
                      </div>
                      <span className="text-white font-semibold">Grabando...</span>
                    </div>
                    <button
                      onClick={toggleListening}
                      className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 shadow-lg shadow-cyan-500/30"
                    >
                      <MicOff className="w-4 h-4" />
                      Detener
                    </button>
                  </div>
                  
                  {/* Waveform Visualization */}
                  <div className="flex items-center justify-center gap-1 h-12">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-cyan-400 to-teal-300 rounded-full shadow-sm shadow-cyan-400/50"
                        style={{
                          height: '100%',
                          animation: `wave-recording 0.8s ease-in-out ${i * 0.05}s infinite`,
                          opacity: 0.8
                        }}
                      ></div>
                    ))}
                  </div>
                  
                  <p className="text-cyan-100 text-sm text-center mt-4 font-medium">
                    🎤 Habla tu pregunta... Al terminar, presiona "Detener"
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-white/20 p-4 bg-white/5">
              <div className="flex gap-2">
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition ${
                    isListening
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/30 animate-pulse'
                      : 'bg-white/10 hover:bg-white/20 border border-white/20'
                  }`}
                  title={isListening ? 'Detener grabación' : 'Iniciar grabación de voz'}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu pregunta o usa el micrófono..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition backdrop-blur-sm"
                  disabled={isListening}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 p-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {!isListening && !isSpeaking && !isGeneratingAudio && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  💡 Cada respuesta tiene dos opciones: <span className="text-white">⚡ Rápida</span> (instantánea) o <span className="text-cyan-400">🎙️ Premium</span> (mi voz clonada IA)
                </p>
              )}
              {isGeneratingAudio && (
                <p className="text-xs text-yellow-400 mt-2 text-center animate-pulse">
                  🎵 Generando mi voz clonada con IA... (vale la espera)
                </p>
              )}
              {isSpeaking && !isGeneratingAudio && (
                <p className="text-xs text-cyan-400 mt-2 text-center">
                  🔊 Reproduciendo • Haz clic de nuevo para pausar
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold mb-12 text-center">
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Servicios
          </span>
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
            <h3 className="text-2xl font-bold mb-4">Agentes IA Conversacionales</h3>
            <p className="text-gray-300 mb-4">
              Diseño e implementación de soluciones con LLMs, RAG y MCP para automatizar procesos y gestión del conocimiento en organizaciones.
            </p>
            <a href="https://mentor-ia.cl" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2">
              Visitar Mentor-IA <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
            <h3 className="text-2xl font-bold mb-4">Desarrollo Web & Analytics</h3>
            <p className="text-gray-300 mb-4">
              Creación de sitios web, integración de soluciones y análisis de comportamiento de usuarios para optimizar conversiones.
            </p>
            <a href="https://desarrollo-web.cl" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 flex items-center gap-2">
              Ver servicios web <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="contact" className="relative z-10 px-6 py-20 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6">
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            ¿Trabajamos juntos?
          </span>
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Estoy disponible para proyectos de implementación de IA, desarrollo web y consultoría.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="mailto:carla@cardev.cl"
            className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition"
          >
            Enviar email
          </a>
          <a
            href="https://www.linkedin.com/in/carla-molina"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 px-8 py-3 rounded-lg font-semibold hover:bg-white/5 transition flex items-center gap-2"
          >
            LinkedIn <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-8 border-t border-white/10 text-center text-gray-400">
        <p>© 2024 Carla Pamela Molina Jerez • CarDev • Construido con IA conversacional</p>
      </footer>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { height: 10px; }
          50% { height: 20px; }
        }
        
        @keyframes wave-recording {
          0%, 100% { 
            height: 20%;
            opacity: 0.5;
          }
          50% { 
            height: 80%;
            opacity: 1;
          }
        }
        
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
        
        @keyframes animate-pulse-slow {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.9;
            transform: scale(1.02);
          }
        }
        
        .animate-pulse-slow {
          animation: animate-pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PortafolioCarDev;
