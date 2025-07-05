import OpenAI from 'openai';
import { config } from '../../config';
import { processImage } from "../../services/AI/ocrService";
import fs from "fs";
import fetch from "node-fetch";
import path, { dirname } from "path";
import { SpeechClient } from "@google-cloud/speech";
import { exec } from "child_process";
import util from "util";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, GenerativeModel, Part } from "@google/generative-ai";

// Definir __dirname en ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class aiServices {
    private generativeModel: GenerativeModel;

    constructor() {
        // Asegúrate de que tu config/index.ts exporte GOOGLE_API_KEY
        const genAI = new GoogleGenerativeAI(config.Google.apiKey);
        this.generativeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async chat(
        prompt: string,
        messages: { role: string; content: string }[]
      ): Promise<string> {
        // Usar el prompt proporcionado en lugar del hardcodeado
        const combined = [
          prompt,
          // Si hay mensajes adicionales, los agregamos
          ...messages.map(msg => `${msg.role}: ${msg.content}`)
        ].join("\n");
      
        try {
            const result = await this.generativeModel.generateContent(combined);
            const response = await result.response;
            const text = response.text();
            return text.trim();
        } catch (err: any) {
          console.error("❌ Error Gemini:", err);
          return "-ERROR-";
        }
      }
      

    // 🔥 Método para analizar texto o IMAGEN de transacciones
    async extractTransactionData(input: { text?: string; image?: { buffer: Buffer; mimeType: string } }): Promise<any> {
        try {

            const prompt = `Tu única tarea es analizar el texto o la imagen de una transacción y devolver exclusivamente un JSON válido con los datos extraídos, sin explicaciones, comentarios o texto adicional. Responde siempre en español y solo con el JSON exacto. POR EJEMPLO:

                                    {
                                    "monto": "\\$39.900,00",
                                    "comercio": "Veterinaria",
                                    "fecha": "29/01/2025",
                                    "metodoPago": "Transferencia",
                                    "entidadMetodoPago": "Nequi",
                                    "negocio": "Finca la Esperanza",
                                    "vertical": "Lechería",
                                    "tipo": "gasto"
                                    }

                                    🚨 **Instrucciones para texto sucio (OCR):**
                                    El texto que analizarás proviene de un OCR y puede estar muy desordenado, con caracteres sin sentido, palabras mal escritas o saltos de línea extraños. Tu tarea es encontrar las palabras clave (como "Total", "Efectivo", "Fecha") incluso si están rodeadas de "basura". Sé flexible con la ortografía y el formato. Ignora el texto que no parezca relevante.

                                    📌 Instrucciones para detectar el monto:

                                    * **REGLA DE ORO (OBLIGATORIA):** Tu objetivo principal es encontrar el valor asociado a la palabra "Total" o una muy similar (como "EsTotal"). Ignora todo lo demás si encuentras esta palabra clave.
                                    * **EJEMPLO CRÍTICO:** Si el texto dice "Total: \\$107,000" y también "Efectivo: \\$120,000", el monto correcto es **OBLIGATORIAMENTE** "\\$107,000".
                                    * **NO USAR:** Nunca uses los números que sigan a "Efectivo", "Recibido", "Cambio", "Vueltas". Estos son parte del pago, no del costo.
                                    * **PLAN B (Solo si no hay "Total"):** Si y solo si no existe la palabra "Total" (o similar) en el texto, entonces puedes usar el número más alto que parezca un total.
                                    * Formatea siempre el monto como \\$123.456,00.

                                    📌 Instrucciones para detectar el comercio:

                                    * El comercio puede ser "Ferretería" si se menciona clavos, herramientas, tornillos, materiales, etc.
                                    * "Veterinaria" si menciona medicamentos, vacunas, tratamientos animales, consultas veterinarias.
                                    * Si se menciona alimento para animales, concentrados, balanceados, será comercio relacionado a alimento animal.
                                    * Si no se detecta con certeza, dejar el campo en [].

                                    📌 Instrucciones para detectar la fecha:

                                    * Puede venir precedida por "Fecha", "Creación", "El".
                                    * Convertir fechas relativas como "ayer" o "hace 3 días" a fecha absoluta formato DD/MM/YYYY basado en fecha actual.
                                    * Si no se puede determinar con certeza, déjalo como null.

                                    📌 Instrucciones para detectar el método de pago:

                                    * Puede venir precedido por "Con tu", "Tarjeta", "Transferencia desde", "Pagué por".
                                    * Opciones para metodoPago:

                                    * "Tarjeta de crédito", "Tarjeta de débito"
                                    * "Transferencia"
                                    * "Consignación"
                                    * "Efectivo"
                                    * Si no se determina con certeza dejar en [].

                                    📌 Instrucciones para detectar la entidad del método de pago:

                                    * Puede venir precedido por "Con tu", "Tarjeta", "Transferencia desde".
                                    * Entidades comunes:

                                    * Rappi pay (Quizas queda como "rap" o "Rap" o similar)
                                    * Nequi (aveces puede llegar como Neky)
                                    * Davivienda
                                    * Nu o Nubank (Quizas queda como "Novak" o similar)
                                    * Bancolombia
                                    * BBVA (Aveces puede venir seguido de números, deja solo "BBVA")
                                    * Daviplata
                                    * AV Villas
                                    * Colpatria
                                    * Itaú
                                    * Caja Social
                                    * Banco de Bogotá
                                    * Banco de Occidente
                                    * Banco Popular
                                    * Banco Caja Social
                                    * Banco Agrario
                                    * Si es efectivo usar "NA", si no se determina dejar en null.
                                    * Si no puedes determinarlo con certeza, deja el campo en null.
                                    * ÚNICAMENTE si el método de pago es "Efectivo", deja la entidad como "NA".

                                    📌 Instrucciones para detectar si es ingreso, gasto o inversión:

                                    * "Pago recibido", "Depósito", "Ingreso", "Abono recibido" son "ingreso".
                                    * "Compra", "Pago", "Retiro", "Nómina", "Gasto", "Factura", son "gasto".
                                    * Si no se determina, dejar vacío.

                                    📌 Instrucciones para detectar la categoría:

                                    * Las categorías ahora provienen de la base de datos.
                                    * Ejemplos de categoría serán negocios específicos que administra el usuario.
                                    * Si no hay suficiente información, usa "categoria": null.
                                    * Este usuario tiene las siguientes categorías: 

                                    📌 Instrucciones para detectar la vertical (subcategoría):

                                    * Las verticales provienen de la base de datos, por ejemplo: Lechería, Ganadería, Ceba, Cría de ganado, Producción de huevos, Porcicultura, Huerta de frutas, Huerta de verduras.
                                    * Si menciona alimento específico como rentaleche, asignar a la vertical correspondiente ("Lechería").
                                    * Si no se detecta claramente dejar "vertical": null.

                                    📌 Instrucciones adicionales:

                                    * El campo "tipo" solo acepta valores "ingreso", "gasto" o "inversion".
                                    * Siempre usar "comercio" en lugar de tienda, negocio, etc.
                                    * El campo "negocio" es obligatorio y representa el negocio del usuario.
                                    * Si no se determina claramente dejar el campo en [].

                                    🚨 Reglas obligatorias:

                                    * El campo "tipo" solo puede tener los valores "ingreso" o "gasto".
                                    * Si no hay categoría clara, usa "categoria": null.
                                    * El campo "vertical" es vital y preferentemente debe ser completado, dejar null si es imposible determinar.

                                    🚨 Analiza la imagen o el siguiente texto si se proporciona.`;

            const parts: Part[] = [
                { text: prompt },
            ];

            if (input.image) {
                parts.push({
                    inlineData: {
                        mimeType: input.image.mimeType,
                        data: input.image.buffer.toString("base64"),
                    },
                });
            } else if (input.text) {
                parts.push({ text: `Texto de la transacción a analizar: "${input.text}"` });
            } else {
                throw new Error("Se debe proporcionar texto o una imagen.");
            }

            const result = await this.generativeModel.generateContent({
                contents: [{ role: "user", parts }],
                generationConfig: {
                    responseMimeType: "application/json",
                },
            });
            const response = await result.response;
            const responseText = response.text();

            console.log("JSON extraído de Gemini:", responseText);

            let jsonRespuesta;
            try {
                jsonRespuesta = JSON.parse(responseText);
                console.log("✅ JSON de Gemini parseado:", jsonRespuesta);
            } catch (error) {
                console.error("❌ Error al parsear JSON de Gemini:", error);
                console.error("Este era el mensaje que se intentaba parsear:", responseText);
                return null;
            }

            // 📌 Función para obtener la fecha actual en formato DD/MM/YYYY
            const obtenerFechaActual = (): string => {
                const hoy = new Date();
                const dia = String(hoy.getDate()).padStart(2, '0');
                const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
                const año = hoy.getFullYear();
                return `${dia}/${mes}/${año}`;
            };

            const formatearMonto = (monto: number | string): string => {
                if (!monto) return null;

                let montoNumerico: number;

                if (typeof monto === "string") {
                    let clean = monto.replace(/[$\s]/g, ""); // Eliminar $ y espacios

                    // Detectar formato europeo: termina en coma y 1-2 dígitos
                    const comaDecimalMatch = clean.match(/,(\d{1,2})$/);
                    // Detectar formato estadounidense: termina en punto y 1-2 dígitos
                    const dotDecimalMatch = clean.match(/\.(\d{1,2})$/); 

                    if (comaDecimalMatch) {
                        // Caso europeo: eliminar separadores de miles (puntos) y cambiar coma decimal por punto
                        clean = clean.replace(/\./g, "").replace(",", ".");
                    } else if (dotDecimalMatch) {
                        // Caso estadounidense: eliminar separadores de miles (comas) y dejar el punto decimal
                        clean = clean.replace(/,/g, "");
                    } else {
                        // Caso sin decimales o formato no reconocido: eliminar comas y puntos
                        clean = clean.replace(/,/g, "").replace(/\./g, "");
                    }

                    montoNumerico = parseFloat(clean);
                } else {
                    montoNumerico = monto;
                }

                if (isNaN(montoNumerico)) return "$0,00";

                return `$${montoNumerico.toLocaleString("es-CO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`;
            };


            // 📌 🔥 Construcción de JSON limpio y normalizado
            const jsonLimpio = {
                monto: formatearMonto(jsonRespuesta.Productos?.Totales?.Precio_Total ||
                    jsonRespuesta.transaccion?.monto ||
                    jsonRespuesta.transaction?.amount ||
                    jsonRespuesta.Recibo?.Precio_total ||
                    jsonRespuesta.Recibo?.precio_total ||
                    jsonRespuesta.recibo?.precio_total ||
                    jsonRespuesta.Pago?.Importe ||
                    jsonRespuesta.monto || null),

                comercio: jsonRespuesta.Recibo?.restaurante ||
                    jsonRespuesta.transaccion?.lugar ||
                    jsonRespuesta.transaction?.service ||
                    jsonRespuesta.recibo?.restaurante ||
                    jsonRespuesta.transaction?.merchant ||
                    jsonRespuesta.Pago?.Comercio ||
                    jsonRespuesta.comercio ||
                    jsonRespuesta.tienda ||
                    jsonRespuesta.lugar ||
                    jsonRespuesta.ubicación ||
                    null,

                fecha: jsonRespuesta.Recibo?.fecha_impresion ||
                    jsonRespuesta.Recibo?.fecha_creacion ||
                    jsonRespuesta.recibo?.fecha_impresion ||
                    jsonRespuesta.recibo?.fecha_creacion ||
                    jsonRespuesta.Pago?.Fecha_de_pago ||
                    jsonRespuesta.fecha ||
                    obtenerFechaActual(),

                metodoPago: jsonRespuesta.transaction?.paymentMethod?.type ||
                    jsonRespuesta.transaction?.payment_method ||
                    jsonRespuesta.transaction?.paymentMethod ||
                    jsonRespuesta.transaccion?.metodo_pago ||
                    jsonRespuesta.metodoPago?.tipo ||
                    jsonRespuesta.metodo_de_pago?.tipo ||
                    jsonRespuesta.Pago?.Forma_de_pago ||
                    jsonRespuesta.metodoPago ||
                    jsonRespuesta.transaccion?.metodo_pago?.tipo ||
                    jsonRespuesta["método_de_pago"] || null,

                entidadMetodoPago: jsonRespuesta.entidadMetodoPago ||
                    jsonRespuesta.transaction?.paymentMethod?.bank ||
                    jsonRespuesta.transaction?.bank ||
                    jsonRespuesta.metodo_de_pago?.banco ||
                    jsonRespuesta.transaccion?.banco ||
                    jsonRespuesta.banco ||
                    jsonRespuesta.transaccion?.metodo_pago?.banco ||
                    null, // Ahora soporta "banco"

                    categoria: null,

                /*categoria: jsonRespuesta.categoria ||
                    jsonRespuesta.descripcion ||
                    jsonRespuesta.transaccion?.descripcion ||
                    jsonRespuesta.item ||
                    null,*/
                subcategoria: jsonRespuesta.subcategoria || null,

                tipo: jsonRespuesta.tipo || null,

                userPhoneNumber: null,
                userId: null,
                canal: "WhatsApp"
            };

            console.log("✅ Respuesta de Gemini:", responseText);
            console.log("✅ Respuesta modificada:", JSON.stringify(jsonLimpio, null, 2));

            return jsonLimpio;
        } catch (error) {
            console.error("❌ Error extrayendo datos con Gemini:", error);
            return null;
        }
    }

    async detectIntent(text: string): Promise<string> {
        try {
            const prompt = `Instrucciones: 
                                    Eres un asistente de IA experto en interpretar mensajes de usuarios en un chatbot de finanzas agropecuarias.
                                    Tu tarea es determinar la intención del usuario con base en el texto proporcionado.
                                    
                                    Devuelve solo una de las siguientes opciones:
                                    - "FAQ" si el usuario está haciendo una pregunta general.
                                    - "REGISTRAR_TRANSACCION" si el usuario está intentando registrar un pago, Gasto, una compra o ingreso.
                                    - "REGISTRAR_PRODUCCION" si el usuario menciona registrar producción, como litros de leche, recolección de huevos, etc. Ejemplos: "La vaca 5 produjo 20 litros", "Hoy recogí 50 huevos", "Registrar producción de leche".
                                    - "GESTIONAR_INVENTARIO" si el usuario quiere agregar, eliminar o gestionar items del inventario como vacas, gallinas, etc. Ejemplos: "Agregar vaca", "Eliminar gallina", "Gestionar inventario", "Agregar nueva vaca al inventario".
                                    - "SALUDO" si el usuario envía un saludo como "Hola" o "fridoom".
                                    - "NO_DETECTED" si el mensaje no corresponde a ninguna de las anteriores.
                                    
                                    No incluyas explicaciones adicionales, solo responde con la intención exacta.
                                    
                                    **Texto a analizar:** "${text}"`;
            
            const result = await this.generativeModel.generateContent(prompt);
            const response = await result.response;
            const intentText = response.text().replace(/"/g, '').trim();

            return intentText || "NO_DETECTED";
        } catch (error) {
            console.error("❌ Error detectando intención con Gemini:", error);
            return "NO_DETECTED";
        }
    }

    async processAudio(audioUrl: string): Promise<string> {
        try {
            console.log(`🔽 Descargando audio desde: ${audioUrl}`);
            const execPromise = util.promisify(exec);

            const speechClient = new SpeechClient();

            const response = await fetch(audioUrl, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${process.env.jwtToken}`, // Token de WhatsApp
                    "Accept": "audio/ogg"
                }
            });

            if (!response.ok) throw new Error(`Error al descargar el audio. Código: ${response.status}`);

            const audioBuffer = Buffer.from(await response.arrayBuffer());
            // Simular __dirname en ES Module
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);

            const tempDir = path.resolve(__dirname, "../../temp");

            await fs.promises.mkdir(tempDir, { recursive: true });

            const inputAudioPath = path.join(tempDir, "temp_audio.ogg");
            const outputAudioPath = path.join(tempDir, "temp_audio.wav");

            await fs.promises.writeFile(inputAudioPath, audioBuffer);
            console.log("✅ Audio descargado correctamente.");

            console.log("🎙️ Convirtiendo audio a WAV...");
            await execPromise(`ffmpeg -y -i "${inputAudioPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputAudioPath}"`);

            console.log("✅ Conversión completada.");

            // Leer el archivo convertido
            const audioFile = await fs.promises.readFile(outputAudioPath);

            // Configurar la solicitud para Google Speech-to-Text
            const request = {
                audio: { content: audioFile.toString("base64") },
                config: {
                    encoding: "LINEAR16" as const,
                    sampleRateHertz: 16000,
                    languageCode: "es-ES",
                },
            };

            console.log("⏳ Enviando audio a Google Speech-to-Text...");
            const [responseGCP] = await speechClient.recognize(request);

            // Obtener la transcripción
            const transcription = responseGCP.results
                .map(result => result.alternatives[0].transcript)
                .join("\n");

            console.log("✅ Transcripción completada:", transcription);

            // Eliminar archivos temporales
            await fs.promises.unlink(inputAudioPath);
            await fs.promises.unlink(outputAudioPath);

            return transcription || "";
        } catch (error) {
            console.error("❌ Error en la transcripción de audio:", error);
            return "";
        }
    }

    /**
     * Envía un archivo de audio a Gemini para extraer datos estructurados.
     * @param audioPath La ruta al archivo de audio.
     * @param mimeType El tipo MIME del audio.
     * @returns Un objeto JSON con los datos extraídos.
     */
    async extractDataFromAudio(audioPath: string, mimeType: string): Promise<any> {
        console.log(`🤖 Iniciando extractDataFromAudio. audioPath=${audioPath}, mimeType=${mimeType}`);
        const model = this.generativeModel;

        const fileToGenerativePart = (path: string, mimeType: string) => ({
            inlineData: {
                data: fs.readFileSync(path).toString("base64"),
                mimeType,
            },
        });

        const audioPart = fileToGenerativePart(audioPath, mimeType);

        const prompt = `
        Analiza el siguiente audio. Tu tarea es identificar si el usuario quiere registrar una transacción (gasto/ingreso) o una producción (leche, huevos).
        Responde únicamente con un objeto JSON. No incluyas "json" ni "" en la respuesta.

        1. Si es una TRANSACCIÓN, usa esta estructura:
        {
            "tipo_registro": "transaccion",
            "monto": "el monto detectado",
            "comercio": "el comercio o lugar",
            "fecha": "la fecha en formato DD/MM/AAAA",
            "metodoPago": "el método de pago",
            "categoria": "el negocio principal mencionado",
            "subcategoria": "la subcategoría si se menciona",
            "tipo": "gasto" o "ingreso"
        }
        Ejemplo: "Gasto de 50 mil pesos en la ferretería para el negocio de Arepas" -> {"tipo_registro": "transaccion", "monto": "50000", "comercio": "Ferretería", "categoria": "Arepas", "tipo": "gasto"}

        2. Si es una PRODUCCIÓN, usa esta estructura:
        {
            "tipo_registro": "produccion",
            "items": [
                {
                    "item_name": "el nombre del item detectado",
                    "cantidad": "la cantidad detectada O 0 si no se especifica",
                    "unidad": "la unidad detectada (ej. litros, huevos, kilos)"
                }
            ]
        }
        
        **REGLAS ESPECIALES PARA PRODUCCIÓN:**
        - Si menciona múltiples items → crear un array con todos los items
        - Si menciona "leche" pero no especifica item exacto → usar "Producción general"
        - Si menciona "huevos" pero no especifica item exacto → usar "Recolección general"
        - Si NO especifica cantidad exacta → usar cantidad: 0
        - Si menciona el negocio (ej: "finca tame") → incluirlo en item_name
        - Ser FLEXIBLE con audios incompletos, no rechazar por falta de detalles

        Ejemplos:
        - "La vaca 5 produjo 20 litros hoy" -> {"tipo_registro": "produccion", "items": [{"item_name": "Vaca 5", "cantidad": 20, "unidad": "litros"}]}
        - "La vaca 1 produjo 10 litros, la vaca 2 20 litros y la vaca 3 30 litros" -> {"tipo_registro": "produccion", "items": [{"item_name": "Vaca 1", "cantidad": 10, "unidad": "litros"}, {"item_name": "Vaca 2", "cantidad": 20, "unidad": "litros"}, {"item_name": "Vaca 3", "cantidad": 30, "unidad": "litros"}]}
        - "Quiero registrar producción de leche en finca tame" -> {"tipo_registro": "produccion", "items": [{"item_name": "Finca Tame - Producción general", "cantidad": 0, "unidad": "litros"}]}
        - "Registrar huevos de hoy" -> {"tipo_registro": "produccion", "items": [{"item_name": "Recolección general", "cantidad": 0, "unidad": "huevos"}]}

        Si realmente no puedes determinar la acción, devuelve un JSON con "tipo_registro": "desconocido".
        `.trim();

    try {
      console.log("🔍 Prompt enviado a Gemini (Audio):", prompt);
      console.log("🔍 audioPart (bytes):", fs.statSync(audioPath).size);

      const result = await model.generateContent([prompt, audioPart]);
      console.log("🔍 Resultado completo de generateContent:", JSON.stringify(result, null, 2));

      const resp = await result.response;
      console.log("🔍 Objeto response:", JSON.stringify(resp, Object.getOwnPropertyNames(resp), 2));

      const textResponse = await resp.text();
      console.log("✅ Respuesta cruda de Gemini (Audio):", textResponse);

      // Limpieza del JSON en una nueva variable
      const cleaned = textResponse
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```$/g, '')
        .trim();
      console.log("🔍 Texto tras limpieza de fences:", cleaned);

      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      const jsonString = (start >= 0 && end >= 0)
        ? cleaned.slice(start, end + 1)
        : cleaned;
      console.log("🔍 JSON extraído:", jsonString);

      const parsed = JSON.parse(jsonString);
      console.log("✅ JSON parseado:", parsed);
      return parsed;

    } catch (error) {
      console.error("❌ Error extrayendo datos del audio con Gemini:", error);
      return { tipo_registro: 'desconocido' };
    } finally {
      if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
          console.log("🧹 Archivo de audio temporal eliminado:", audioPath);
      }
    }
}
}

export default new aiServices();
