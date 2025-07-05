import { config } from "../config";
import path from "path";
import fs from "fs";
import { createFlowRouting } from "@builderbot-plugins/langchain";
import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "../services/AI/aiServices";
import { menuFlow } from "./menuFlow";
import { faqFlow } from "./faqFlow";
import { photoFlow } from "./transactions/photoFlow";
import { audioFlow } from "./transactions/audioFlow";
import { textFlow } from "./transactions/textFlow";
import { startProductionFlow } from "./production/startProductionFlow";
import { manageInventoryFlow } from "./production/manageInventoryFlow";

const PROMPT_DETECTED = path.join(process.cwd(), "assets/prompts", "prompt_Detection.txt");

const promptDetected = fs.readFileSync(PROMPT_DETECTED, "utf8");

export const DetectIntention = createFlowRouting
  .setKeyword([EVENTS.ACTION, EVENTS.MEDIA, EVENTS.VOICE_NOTE])
  .setIntentions({
    intentions: ["MENU_OPCIONES", "FAQ", "REGISTRAR_TRANSACCION", "REGISTRAR_PRODUCCION", "GESTIONAR_INVENTARIO", "SALUDO", "NO_DETECTED"],
    description: promptDetected,
  })
  .setAIModel({
    modelName: "openai" as any,
    args: {
      modelName: config.Model,
      apikey: config.ApiKey,
    },
  })
  .create({
    afterEnd(flow) {
      return flow.addAction(async (ctx, { state, endFlow, gotoFlow }) => {
        try {
          // 1. Redirigir directamente si es imagen o audio
          if (ctx.type === "image") {
            console.log("📸 Imagen detectada, redirigiendo a photoFlow.");
            return gotoFlow(photoFlow);
          }
          if (ctx.type === "audio") {
            console.log("🎤 Audio detectado, redirigiendo a audioFlow.");
            return gotoFlow(audioFlow);
          }

          // 2. Procesar solo si es texto o botón
          let extractedText = "";
          if (ctx.type === "text") {
            extractedText = ctx.body.trim();
          } else if (ctx.type === "button") {
            console.log("Mensaje de botón recibido. Contenido:", {
              body: ctx.body,
              payload: ctx.payload,
              title: ctx.title_button_reply,
            });
            extractedText = ctx.payload?.trim() || ctx.body?.trim();
          }

          if (!extractedText) {
            return endFlow("No pude entender tu mensaje. ¿Podrías intentar nuevamente?");
          }

          // 3. Detectar intención desde el texto
          const detectedIntent = await aiServices.detectIntent(extractedText);
          console.log(`🤖 Intención detectada: ${detectedIntent}`);

          switch (detectedIntent) {
            case "REGISTRAR_TRANSACCION":
              return gotoFlow(textFlow);
            case "REGISTRAR_PRODUCCION":
              return gotoFlow(startProductionFlow);
            case "GESTIONAR_INVENTARIO":
              return gotoFlow(manageInventoryFlow);
            case "FAQ":
              return gotoFlow(faqFlow);
            case "SALUDO":
              console.log("👋 Saludo detectado.");
              return endFlow("¡Hola! ¿En qué puedo ayudarte?");
            default:
              return endFlow("No pude entender tu mensaje. ¿Podrías intentarlo nuevamente?");
          }
        } catch (error) {
          console.error("❌ Error al procesar la intención:", error);
          return endFlow("Ocurrió un problema. Por favor, intenta nuevamente.");
        }
      });
    },
  });

const intentionFlow = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, ctxFn) => {
        // Si el mensaje es una imagen, asumimos que es para registrar una transacción
        if (ctx.type === 'image') {
            console.log("📸 Imagen detectada, iniciando photoFlow.");
            // Aquí no se usa gotoFlow para que el flujo actual maneje la imagen
            // y la pase al siguiente paso, que es el photoFlow.
            return ctxFn.gotoFlow(photoFlow);
        }

        // Si no es una imagen, debe ser texto u otra cosa.
        const textToAnalyze = ctx.body || '';
        if (!textToAnalyze.trim()) {
            return ctxFn.flowDynamic("No he recibido un mensaje válido, por favor intenta de nuevo.");
        }

        // Si es texto, detectamos la intención
        const intent = await aiServices.detectIntent(textToAnalyze);
        await ctxFn.state.update({ intention: intent });

        console.log(`🤖 Intención detectada: ${intent}`);

        switch (intent) {
            case "REGISTRAR_TRANSACCION":
                return ctxFn.gotoFlow(textFlow);
            case "REGISTRAR_PRODUCCION":
                return ctxFn.gotoFlow(startProductionFlow);
            case "GESTIONAR_INVENTARIO":
                return ctxFn.gotoFlow(manageInventoryFlow);
            case "FAQ":
                return ctxFn.gotoFlow(faqFlow);
            case "SALUDO":
                return ctxFn.flowDynamic("¡Hola! ¿En qué puedo ayudarte?");
            default:
                return ctxFn.gotoFlow(photoFlow);
        }
    });

export { intentionFlow };
