import 'dotenv/config';

export const config = {
    PORT: process.env.PORT ?? 3002,

    //Meta
    jwtToken: process.env.jwtToken,
    numberId: process.env.numberId,
    verifyToken: process.env.verifyToken,
    version: 'v22.0',    

    //OpenAI
    Model: process.env.Model,
    ApiKey: process.env.ApiKey,

    // Amazon Bedrock
    Bedrock: {
        region: "us-east-2",
        modelId: process.env.BEDROCK_MODEL_ID || "arn:aws:bedrock:us-east-2:010526261546:inference-profile/us.amazon.nova-micro-v1:0",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },

    //Google
    Google: {
        spreadsheetID: process.env.spreadsheetID,
        privateKey: process.env.privateKey,
        clientEmail: process.env.clientEmail,
        apiKey: process.env.GOOGLE_API_KEY,
        projectId: process.env.GOOGLE_PROJECT_ID,
        location: process.env.GOOGLE_LOCATION || 'us-central1',
        model: process.env.GOOGLE_MODEL || 'gemini-2.5-flash',
    },

    // AI Provider (permite cambiar entre OpenAI, Bedrock y Google)
    AI_PROVIDER: process.env.AI_PROVIDER || 'google' // Cambia a 'google' para usar Gemini por defecto
}