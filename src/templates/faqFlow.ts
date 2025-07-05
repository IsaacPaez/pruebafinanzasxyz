import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "~/services/AI/aiServices";
import sheetsServices from "~/services/cloud/sheetsServices";

export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { endFlow }) => {
    try {
      // 1) Recuperar o iniciar historial
      const history = (await sheetsServices.getUserConv(ctx.from)) || [];

      // 2) Extraer texto según el tipo que ya detectó DetectIntention
      let promptText: string;
      if (ctx.type === "audio" || ctx.type === "voice_note") {
        // ctx.url viene de createFlowRouting
        promptText = await aiServices.processAudio(ctx.url!);
      } else if (ctx.type === "image") {
        return endFlow("Veo que enviaste una imagen. Si quieres registrar una transacción, por favor envíala directamente. Si tienes una pregunta, por favor escríbela.");
      } else {
        promptText = ctx.body.trim();
      }

      // 3) Si no obtuvimos nada
      if (!promptText) {
        return endFlow(
          "No pude entender tu mensaje. ¿Podrías reformularlo?"
        );
      }

      // 4) Añadir al historial y llamar al chat
      history.push({ role: "user", content: promptText });
      const respuesta = await aiServices.chat(promptText, history);

      // 5) Guardar intercambio en Sheets
      await sheetsServices.addConverToUser(ctx.from, [
        { role: "user", content: promptText },
        { role: "assistant", content: respuesta },
      ]);

      // 6) Devolver la respuesta al usuario
      return endFlow(respuesta);
    } catch (error) {
      console.error("Error en FAQ flow:", error);
      return endFlow(
        "Ocurrió un problema procesando tu mensaje, por favor intenta de nuevo."
      );
    }
  });
