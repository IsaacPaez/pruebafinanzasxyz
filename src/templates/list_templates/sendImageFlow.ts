import { addKeyword, EVENTS } from "@builderbot/bot";

const sendImageFlow = addKeyword("GS6310972")
    .addAnswer("Te adjunto una imagen",{
        media:"./assets/sample.png"
    })

export { sendImageFlow };