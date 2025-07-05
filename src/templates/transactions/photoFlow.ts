import { addKeyword, EVENTS } from "@builderbot/bot";
import fetch from "node-fetch";
import aiServices from "../../services/AI/aiServices";
import { supabase } from "../../services/cloud/supabase";
import { askForMissingDataFlow } from "./cases/transactions/askForMissingDataFlow";

const photoFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
        // Si el contexto actual ya contiene una imagen, la procesamos directamente.
        if (ctx.type === 'image' && ctx.url) {
            console.log("📸 Imagen recibida en el contexto, procesando directamente.");
            return await processPhotoAndHandle(ctx.url, ctxFn, ctx);
        }
        // Si no, pedimos al usuario que envíe una.
        await ctxFn.flowDynamic("📸 Por favor, envíame una foto lo más clara posible de tu recibo o factura.");
    })
    .addAnswer(
        "",
        { capture: true },
        async (ctx, ctxFn) => {
            if (ctx.type !== "image" || !ctx.url) {
                return ctxFn.flowDynamic("Eso no parece una imagen. Por favor, envía una foto de tu recibo.");
            }
            return await processPhotoAndHandle(ctx.url, ctxFn, ctx);
        }
    );

async function processPhotoAndHandle(imageUrl: string, ctxFn: any, ctx: any) {
    try {
        const { id: userId } = await verifyUser(ctx.from);
        if (!userId) {
            return ctxFn.flowDynamic("No pude verificar tu usuario. Por favor, asegúrate de estar registrado.");
        }
        console.log(`✅ Usuario verificado. ID: ${userId}`);

        const imageData = await downloadImage(imageUrl, process.env.jwtToken);
        if (!imageData) {
            return ctxFn.flowDynamic("No pude descargar la imagen. Inténtalo de nuevo.");
        }

        const extractedData = await aiServices.extractTransactionData({
            image: { buffer: imageData.buffer, mimeType: imageData.mimeType }
        });

        if (!extractedData || Object.keys(extractedData).length === 0) {
            console.error("⚠️ No se pudieron extraer datos válidos.");
            return ctxFn.flowDynamic("No pude extraer información de la transacción. ¿Podrías intentarlo con una foto más clara?");
        }
        console.log("🔍 Datos extraídos:", extractedData);

        await ctxFn.state.update({ ...extractedData, userId, userPhoneNumber: ctx.from, canal: 'WhatsApp' });
        return ctxFn.gotoFlow(askForMissingDataFlow);

    } catch (error) {
        console.error("❌ Error en processPhotoAndHandle:", error);
        return ctxFn.flowDynamic("Ocurrió un error inesperado al procesar tu imagen. Por favor, intenta de nuevo más tarde.");
    }
}

async function downloadImage(url: string, accessToken?: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
        console.log(`🔽 Descargando imagen desde: ${url}`);
        const response = await fetch(url, {
            method: "GET",
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });

        if (!response.ok) {
            console.error(`Error al descargar imagen: ${response.status} - ${response.statusText}`);
            return null;
        }

        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await response.arrayBuffer());

        console.log(`✅ Imagen descargada (${buffer.byteLength} bytes, ${mimeType}).`);
        return { buffer, mimeType };
    } catch (error) {
        console.error("❌ Error en downloadImage:", error);
        return null;
    }
}

async function verifyUser(phone: string) {
    const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error("Error en Supabase:", error);
        return { id: null };
    }
    return { id: data?.id || null };
}

export { photoFlow, askForMissingDataFlow };