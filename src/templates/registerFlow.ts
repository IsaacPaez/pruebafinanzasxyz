import { addKeyword, EVENTS } from "@builderbot/bot";
import appwriteAuth from "../services/cloud/appwriteAuth";

const registerFlow = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "No te he visto por aquí antes. ¿Te gustaría registrarte? 📝",
        {
            capture: true,
            buttons: [
                { body: "Sí, quiero!" },
                { body: "No, gracias!" }
            ]
        },
        async (ctx, ctxFn) => {
            if (ctx.body === "No, gracias!") {
                return ctxFn.endFlow("El registro fue cancelado. Puedes escribirme cuando estés listo. 😊");
            }
            await ctxFn.flowDynamic("¡Perfecto! registrate en este formulario 🚀");
        }
    )
export { registerFlow };
