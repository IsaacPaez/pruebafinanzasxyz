import fs from "fs";
import fetch from "node-fetch";
import path, { dirname } from "path";
import { SpeechClient } from "@google-cloud/speech";
import { exec } from "child_process";
import util from "util";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execPromise = util.promisify(exec);
const speechClient = new SpeechClient();

async function processAudio(audioUrl: string): Promise<string | null> {
    try {
        // Agregar headers de autenticación con token de WhatsApp Business
        const response = await fetch(audioUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.jwtToken}`, // Asegúrate de usar el token correcto
                "Accept": "audio/ogg"
            }
        });

        if (!response.ok) throw new Error(`Error al descargar el audio. Código: ${response.status}`);

        const audioBuffer = Buffer.from(await response.arrayBuffer());
        const tempDir = path.resolve(__dirname, "../../temp");
        await fs.promises.mkdir(tempDir, { recursive: true });

        const inputAudioPath = path.join(tempDir, "temp_audio.ogg");
        const outputAudioPath = path.join(tempDir, "temp_audio.wav");

        await fs.promises.writeFile(inputAudioPath, audioBuffer);
        ("✅ Audio descargado correctamente.");

        const ffmpegPromise = execPromise(`ffmpeg -i ${inputAudioPath} -ar 16000 -ac 1 -c:a pcm_s16le ${outputAudioPath}`);

        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("FFmpeg tardó demasiado en procesar el audio.")), 50000) // 30s timeout
        );

        try {
            const result = await Promise.race([ffmpegPromise, timeout]);

            if (result && typeof result === 'object' && 'stdout' in result && 'stderr' in result) {
                console.log("FFmpeg stdout:", result.stdout);
                console.error("FFmpeg stderr:", result.stderr);
            }
        } catch (error) {
            console.error("❌ Error en FFmpeg:", error);
        }

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

        // Eliminar archivos temporales
        await fs.promises.unlink(inputAudioPath);
        await fs.promises.unlink(outputAudioPath);

        return transcription || null;
    } catch (error) {
        console.error("❌ Error en la transcripción de audio:", error);
        return null;
    }
}

export { processAudio };
