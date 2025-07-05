import { addKeyword, EVENTS } from "@builderbot/bot";
import { photoFlow } from "./photoFlow";
import { audioFlow } from "./audioFlow";
import { textFlow } from "./textFlow";

const transactionFlow = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "¡Vamos a registrar una nueva transacción! 📝\n\nPuedes enviarme una *foto de tu recibo o factura* 📸\n\nO si prefieres un *audio* 🗣️\n\nIncluso puedes ingresar los datos manualmente por texto 📝",
        {
            capture: true,
            buttons: [
                { body: "Foto 📸" },
                { body: "Audio 🗣️" },
                { body: "Texto 📝" }
            ]
        },
        async (ctx, ctxFn) => {

            console.log("📩 Mensaje recibido:", ctx.body);
            const respuesta = ctx.body.trim(); // Normaliza el texto

            if (respuesta === "Foto 📸") {
                console.log("📸 Usuario eligió enviar una foto.");
                return ctxFn.gotoFlow(photoFlow); // Redirige a flujo para recibir fotos
            }

            if (respuesta === "Audio 🗣️") {
                console.log("🎙️ Usuario eligió enviar un audio.");
                return ctxFn.gotoFlow(audioFlow); // Redirige a flujo para recibir audios
            }

            if (respuesta === "Texto 📝") {
                console.log("📝 Usuario eligió ingresar los datos manualmente.");
                return ctxFn.gotoFlow(textFlow); // Redirige a flujo para ingresar datos manualmente
            }

            if (respuesta === "Cancelar ❌") {
                console.log("❌ Usuario canceló el registro.");
                return ctxFn.endFlow("Registro cancelado. Si necesitas algo más, avísame. 😊");
            }

            // 🔄 En caso de respuesta no válida, vuelve a mostrar las opciones
            return ctxFn.flowDynamic(
                "⚠️ Opción no válida. Por favor, selecciona una de las opciones con los botones."
            );
        }
    );

export { transactionFlow };


