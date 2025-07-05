import { addKeyword } from "@builderbot/bot";

const sendVideoFlow = addKeyword("GS6310972")
    .addAnswer("Aquí tienes el video que pediste 🎥", {
        media: "./assets/sample.mp4" // Ruta al archivo de video
    });

export { sendVideoFlow };
