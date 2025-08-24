async function llamarAGemini() {
            // const apiKey = document.getElementById('apiKey').value;
            const prompt = document.getElementById('prompt').value;
            const responseContainer = document.getElementById('response-container');
            const submitBtn = document.getElementById('submitBtn');

            if (!apiKey || !prompt) {
                responseContainer.innerText = "Por favor, introduce tu API Key y una pregunta.";
                return;
            }

            // Deshabilitar botón y mostrar estado de carga
            submitBtn.disabled = true;
            submitBtn.innerText = "Pensando...";
            responseContainer.innerText = "Generando respuesta...";

            const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-12b-it:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(apiURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }]
                    })
                });

                if (!response.ok) {
                    // Si la respuesta del servidor no es exitosa, muestra el error
                    const errorData = await response.json();
                    throw new Error(`Error ${response.status}: ${errorData.error.message}`);
                }

                const data = await response.json();
                
                // Extraer el texto de la respuesta
                const textoRespuesta = data.candidates[0].content.parts[0].text;
                responseContainer.innerText = textoRespuesta;

            } catch (error) {
                console.error('Error al llamar a la API:', error);
                responseContainer.innerText = `Ha ocurrido un error: ${error.message}`;
            } finally {
                // Volver a habilitar el botón
                submitBtn.disabled = false;
                submitBtn.innerText = "Enviar";
            }
        }