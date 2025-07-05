import { addKeyword, EVENTS } from "@builderbot/bot";

const menuFlow = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "Ya puedes comenzar a usar frid♾️m,\n\n¿Cómo vamos a empezar?",
        {
            capture: true,
            buttons: [
                { body: "Transacciones💵" },
                { body: "Dividir gastos👫" },
                { body: "Quiero aprender" },
            ]
        },
        async (ctx, ctxFn) => {
          if (ctx.body.trim() === "Transacciones💵") {
            const videoMessage = {
                type: "video",
                video: {
                    link: "assets/p.mp4" // URL pública del video
                },
                caption: "Aquí tienes un video para empezar con las transacciones. 🎥"
            };
        
            // Enviar el mensaje
            try {
                await ctxFn.provider.sendMessage(`${ctx.from}@s.whatsapp.net`, videoMessage);
                await ctxFn.flowDynamic("¡Te envié un video explicativo para comenzar con las transacciones! 🎥");
            } catch (error) {
                console.error("Error al enviar el video:", error.message);
                await ctxFn.fallBack("Hubo un problema al enviarte el video. Intenta de nuevo más tarde. 😔");
            }
        }
         else if (ctx.body.trim() === "Dividir gastos👫") {
                await ctxFn.flowDynamic("¡Genial! En breve te explicaré cómo dividir gastos.");
            } else if (ctx.body.trim() === "Quiero aprender") {
                await ctxFn.flowDynamic("¡Excelente! Te compartiré información útil para aprender sobre finanzas. 📚");
            } else {
                return ctxFn.fallBack("Por favor, selecciona una opción válida. 😊");
            }
        }
    )
    .addAction(async (ctx, { provider }) => {
        const list = {
            "header": {
                "type": "text",
                "text": "Menú de Opciones"
            },
            "body": {
                "text": "Te voy a dar las opciones que tengo disponibles"
            },
            "footer": {
                "text": ""
            },
            "action": {
                "button": "Opciones",
                "sections": [
                    {
                        "title": "Acciones",
                        "rows": [
                            {
                                "id": "GS6310971",
                                "title": "Audio",
                                "description": "🎵 Quiero escuchar un audio"
                            },
                            {
                                "id": "GS6310972",
                                "title": "Imagen",
                                "description": "🖼️ Quiero recibir una imagen"
                            },
                            {
                                "id": "GS6310973",
                                "title": "PDF",
                                "description": "📄 Quiero recibir un PDF"
                            }
                        ]
                    }
                ]
            }
        };

        // Enviar el mensaje de tipo lista al usuario
        await provider.sendList(`${ctx.from}@s.whatsapp.net`, list);
    });

export { menuFlow };
