import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Code, Brain, Users, Award, ExternalLink, MessageSquare, Sparkles, Zap } from 'lucide-react';

const AVATAR_IMAGE_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'%3E%3Crect fill='%23334155' width='400' height='500'/%3E%3Ctext x='200' y='250' text-anchor='middle' fill='%2306b6d4' font-size='16' font-family='Arial'%3ETu Avatar Aquí%3C/text%3E%3C/svg%3E";

const CarDevPortfolio = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Error de reconocimiento de voz:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Error con el micrófono. ';
        switch(event.error) {
          case 'not-allowed':
            errorMessage += 'Por favor, permite el acceso al micrófono en la configuración del navegador.';
            break;
          case 'no-speech':
            errorMessage += 'No se detectó voz. Intenta de nuevo.';
            break;
          case 'network':
            errorMessage += 'Error de conexión. Verifica tu internet.';
            break;
          default:
            errorMessage += 'Intenta de nuevo o usa el teclado.';
        }
        alert(errorMessage);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('❌ Tu navegador no soporta reconocimiento de voz.\n\n✅ Solución: Usa Chrome o Edge (navegadores recomendados).\n\nMientras tanto, puedes escribir tu pregunta. 😊');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        alert('Error al iniciar el micrófono. Asegúrate de:\n\n1. Permitir acceso al micrófono en tu navegador\n2. Usar Chrome o Edge\n3. Estar en una página con HTTPS (después del deploy funcionará mejor)');
        setIsListening(false);
      }
    }
  };

  const speak = async (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
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
              content: `Eres Carla Pamela Molina Jerez hablando en PRIMERA PERSONA. Estás en tu portfolio conversacional haciendo una "entrevista" bidireccional con un visitante potencial (recruiter, cliente, empresa).

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
      speak(data.content[0].text);
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
    
    return (
      <div className={`relative ${dimension}`}>
        <div className={`absolute inset-0 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 rounded-full blur-3xl opacity-40 ${isTalking ? 'animate-pulse' : ''}`}></div>
        <div className={`absolute inset-0 bg-cyan-400 rounded-full blur-2xl opacity-20 ${isTalking ? 'animate-pulse' : ''}`} style={{animationDelay: '0.3s'}}></div>
        
        <div className="relative w-full h-full">
          <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-cyan-400/50">
            <img 
              src={AVATAR_IMAGE_URL}
              alt="Carla AI Avatar"
              className="w-full h-full object-cover"
              style={{
                filter: 'brightness(1.2) contrast(1.1)',
                mixBlendMode: 'screen'
              }}
            />
            
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
            Ingeniera en IA • Experto 1 en Docencia
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
              <span>15 años docencia</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <Zap className="w-5 h-5 text-cyan-400" />
              <span>Liderazgo de Equipos</span>
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
            <h3 className="text-xl font-bold mb-3">Expertise Técnico en IA</h3>
            <p className="text-gray-300">
              Construcción end-to-end de agentes conversacionales con LLMs, RAG y MCP. Arquitecturas completas desde backend hasta deployment en la nube.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition">
            <Users className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Liderazgo Demostrado</h3>
            <p className="text-gray-300">
              Coordinación de equipos de hasta 15 personas. Experiencia abriendo proyectos complejos de integración desde cero en entornos educativos.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-cyan-500/50 transition">
            <Award className="w-12 h-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Pedagogía Experto 1</h3>
            <p className="text-gray-300">
              15 años enseñando con certificación Experto 1. Capacidad única de explicar conceptos complejos y capacitar equipos en adopción tecnológica.
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
                {isSpeaking && '🗣️ Hablando...'}
                {isListening && '👂 Escuchando...'}
                {!isLoading && !isSpeaking && !isListening && '✨ Lista para conversar'}
              </p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-xs text-gray-400">
              <p className="mb-2 text-cyan-400 font-semibold">💡 Personaliza tu avatar:</p>
              <p>Ve al código y reemplaza AVATAR_IMAGE_URL con tu imagen holográfica personalizada.</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
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
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                        : 'bg-white/10 backdrop-blur-sm border border-white/20'
                    }`}
                  >
                    {msg.content}
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

            <div className="border-t border-white/20 p-4 bg-white/5">
              <div className="flex gap-2">
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-white/10 hover:bg-white/20 border border-white/20'
                  }`}
                  title={isListening ? 'Detener grabación' : 'Hablar'}
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
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 p-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {isListening && '🎤 Escuchando... Habla ahora'}
                {isSpeaking && '🔊 Respondiendo por voz...'}
                {!isListening && !isSpeaking && '💡 Usa Chrome o Edge para mejor experiencia con voz'}
              </p>
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
        <p className="text-xs mt-2">💡 Personaliza el avatar holográfico editando AVATAR_IMAGE_URL en el código</p>
      </footer>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { height: 10px; }
          50% { height: 20px; }
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
      `}</style>
    </div>
  );
};

export default CarDevPortfolio;
