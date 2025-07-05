import { addKeyword, EVENTS } from "@builderbot/bot";
import { registerFlow } from "./registerFlow";
import { DetectIntention } from "./intention.flow";
import supabaseAuth from "../services/cloud/supabaseAuth";

const mainFlow = addKeyword([EVENTS.WELCOME, EVENTS.ACTION, EVENTS.MEDIA, EVENTS.VOICE_NOTE]) // Captura eventos de texto, audio e imágenes
    .addAction(async (ctx, ctxFn) => {
        try {
            // 🔍 Verificar si el usuario ya está registrado en Supabase
            const isUser = await supabaseAuth.userExists(ctx.from);

            if (!isUser) {
                return ctxFn.gotoFlow(registerFlow);
            }

            return ctxFn.gotoFlow(DetectIntention);
        } catch (error) {
            console.error("❌ [mainFlow] Error verificando usuario en Supabase:", error);
            return ctxFn.flowDynamic("Hubo un problema verificando tu cuenta. Inténtalo más tarde.");
        }
    });

export { mainFlow };
