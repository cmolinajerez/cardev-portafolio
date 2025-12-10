export default async function handler(req, res) {
  // Solo permite POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Llamada a ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2', // Modelo en español
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ElevenLabs API Error:', errorData);
      return res.status(response.status).json({ 
        error: 'Error generating audio',
        details: errorData 
      });
    }

    // Obtener el audio como buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convertir a Base64 para enviarlo al frontend
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    return res.status(200).json({ 
      audio: base64Audio,
      contentType: 'audio/mpeg'
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}