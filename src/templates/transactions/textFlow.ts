import { addKeyword, EVENTS } from "@builderbot/bot";
import { askForMissingDataFlow } from "./cases/transactions/askForMissingDataFlow";
import aiServices from "../../services/AI/aiServices";

const textFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    console.log("📩 Mensaje recibido en textFlow:", ctx);
    // Verificar que el mensaje sea de tipo texto y contenga contenido
    if (ctx.type !== "text" || !ctx.body) {
      return ctxFn.fallBack("⚠️ Debes enviar un mensaje de texto con los datos de la transacción.");
    }

    const userText = ctx.body.trim();
    console.log("✅ Texto recibido:", userText);

    // Extraer la información de la transacción del texto usando el servicio de IA
    const extractedData = await aiServices.extractTransactionData({ text: userText });

    if (!extractedData || Object.keys(extractedData).length === 0) {
      console.error("❌ No se pudo extraer información de la transacción.");
      return ctxFn.fallBack("No pude extraer información de la transacción. Por favor, asegúrate de incluir datos como monto, comercio, método de pago, etc.");
    }

    console.log("🔍 Datos extraídos:", extractedData);

    // Actualizar el estado con la información extraída
    await ctxFn.state.update(extractedData);
    console.log("✅ Estado actualizado con datos extraídos.");

    // Continuar hacia el flujo que verifica si faltan datos y, en caso de estar completos, registra la transacción
    return ctxFn.gotoFlow(askForMissingDataFlow);
  });

export { textFlow };
