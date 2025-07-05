import { createBot, MemoryDB as Database } from "@builderbot/bot";
import { provider } from "./provider";
import { config } from "./config";
import templates from "./templates";
import { Request, Response } from "express";

let bot: any = null;

const initBot = async () => {
    if (!bot) {
        bot = await createBot({
            flow: templates,
            provider: provider,
            database: new Database(),
        });
    }
    return bot;
};

// Función para manejar requests HTTP (compatible con Vercel)
export default async function handler(req: Request, res: Response) {
    try {
        const { handleCtx } = await initBot();
        
        // Verificación de webhook (GET)
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode === 'subscribe' && token === config.verifyToken) {
                console.log('✅ Webhook verificado');
                return res.status(200).send(challenge);
            }
            return res.sendStatus(403);
        }

        // Recepción de mensajes (POST)
        if (req.method === 'POST') {
            const body = req.body;
            
            // Procesar el mensaje directamente con el provider de Meta
            if (body.entry && body.entry.length > 0) {
                for (const entry of body.entry) {
                    for (const change of entry.changes || []) {
                        if (change.value.messages) {
                            // El MetaProvider maneja automáticamente estos mensajes
                            console.log('🔔 Mensaje recibido:', change.value.messages[0]);
                        }
                    }
                }
            }
            
            return res.status(200).send('OK');
        }

        res.status(405).send('Method Not Allowed');
    } catch (error) {
        console.error('❌ Error en handler:', error);
        res.status(500).send('Internal Server Error');
    }
}

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
    const PORT = config.PORT || 3002;
    const main = async () => {
        const { httpServer } = await initBot();
        httpServer(+PORT);
        console.log(`🚀 Server local en puerto ${PORT}`);
    };
    main();
}