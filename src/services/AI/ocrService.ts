import Tesseract from "tesseract.js";
import sharp from "sharp";

// Expresión regular para filtrar caracteres válidos (Letras, números, $, ., ,)
const filtrarTexto = (texto: string) => {
    return texto.replace(/[^A-Za-z0-9$., ]/g, ""); // Solo caracteres permitidos
};

async function processImage(imagePath: string) {
    try {
        // Preprocesamiento con sharp antes del OCR
        const processedImagePath = "processed_image.png";
        await sharp(imagePath)
            .resize({ width: 2000 }) // Aumenta resolución
            .grayscale() // Convierte a blanco y negro
            .normalize() // Mejora contraste
            .toFile(processedImagePath);

        // Inicializa el worker de Tesseract
        const worker = await Tesseract.createWorker("spa");
        await worker.load();

        // Configuración avanzada de OCR
        await worker.setParameters({
            tessedit_ocr_engine_mode: "1", // Balance entre rapidez y precisión
        });

        // Procesar la imagen
        const { data: { text } } = await worker.recognize(processedImagePath);

        // Finalizar worker
        await worker.terminate();

        // Filtrar caracteres no deseados
        const textoFiltrado = filtrarTexto(text);
        return textoFiltrado;
    } catch (error) {
        console.error("❌ Error en OCR:", error);
        throw error;
    }
}

export { processImage };
