import { addKeyword, EVENTS } from "@builderbot/bot";

const sendPdfFlow = addKeyword("GS6310973")
    .addAnswer("Te adjunto una imagen",{
        media:"./assets/test.pdf"
    })

export { sendPdfFlow };