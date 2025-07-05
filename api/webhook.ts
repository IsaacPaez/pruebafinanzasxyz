import { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot, MemoryDB as Database } from "@builderbot/bot";
import { provider } from "../src/provider";
import { config } from "../src/config";
import templates from "../src/templates";

// Configurar variables de entorno para Vercel
process.env.NODE_ENV = 'production';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        await initBot();
        
        // Verificación de webhook (GET)
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode === 'subscribe' && token === config.verifyToken) {
                console.log('✅ Webhook verificado');
                return res.status(200).send(challenge);
            }
            return res.status(403).send('Forbidden');
        }

        // Recepción de mensajes (POST)
        if (req.method === 'POST') {
            const body = req.body;
            
            // Procesar el mensaje directamente con el provider de Meta
            if (body.entry && body.entry.length > 0) {
                for (const entry of body.entry) {
                    for (const change of entry.changes || []) {
                        if (change.value.messages) {
                            console.log('🔔 Mensaje recibido:', change.value.messages[0]);
                            // El MetaProvider maneja automáticamente estos mensajes
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
