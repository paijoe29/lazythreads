const { GoogleGenerativeAI } = require('@google/generative-ai');
const { autoReplySettings } = require('../config/settings');

// Initialize Gemini AI
let genAI;
let model;

// Initialize Gemini AI when API key is available
function initializeGemini() {
  if (autoReplySettings.geminiApiKey) {
    try {
      genAI = new GoogleGenerativeAI(autoReplySettings.geminiApiKey);
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      console.log('Gemini AI initialized successfully with gemini-2.0-flash');
    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
    }
  }
}

// Generate AI response using Gemini
async function generateAIResponse(comment, context = '', postContent = '', postAuthor = '') {
  if (!model) {
    throw new Error('Gemini AI not initialized. Please check your API key.');
  }

  // Enhanced prompt with post context for more natural responses
  let enhancedPrompt = `${autoReplySettings.customPrompt}

INSTRUKSI PENTING: 
- Jawab seperti manusia biasa, bukan seperti AI atau bot
- Gunakan bahasa yang santai dan natural
- Jangan gunakan kata-kata seperti "Sebagai AI", "menurut informasi", "berdasarkan postingan"
- Buat respons yang terasa personal dan genuine
- Gunakan emoji secukupnya untuk terkesan lebih natural

`;

  // Add post context if available
  if (postContent || postAuthor) {
    enhancedPrompt += `KONTEKS POSTINGAN:
- Penulis post: ${postAuthor || 'Unknown'}
- Isi post: ${postContent || 'Tidak ada konten post'}

`;
  }

  if (context) {
    enhancedPrompt += `KONTEKS TAMBAHAN:
${context}

`;
  }

  enhancedPrompt += `KOMENTAR YANG HARUS DIBALAS:
"${comment}"

INSTRUKSI FINAL:
Buat balasan yang natural, seolah-olah kamu adalah teman atau follower yang genuine. Jangan terkesan seperti bot atau AI. Gunakan bahasa Indonesia yang santai dan natural.`;

  try {
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    let generatedText = response.text();

    // Clean up any AI-like responses
    generatedText = generatedText
      .replace(/sebagai ai|sebagai chatbot|berdasarkan informasi|menurut data|sebagai model/gi, '')
      .replace(/^(ai|chatbot|bot)[\s:]/gi, '')
      .replace(/\*\*/g, '') // Remove markdown bold
      .trim();

    return generatedText;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

// Update Gemini API key and reinitialize
function updateGeminiApiKey(newApiKey) {
  autoReplySettings.geminiApiKey = newApiKey;
  initializeGemini();
}

module.exports = {
  initializeGemini,
  generateAIResponse,
  updateGeminiApiKey,
  getModel: () => model
};
