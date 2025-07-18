const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('Gemini API key not found in environment variables');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    }
  }

  async generateText(prompt, options = {}) {
    try {
      if (!this.genAI) {
        throw new AppError('Gemini AI service is not configured', 500);
      }

      const {
        maxTokens = 1000,
        temperature = 0.7,
        topP = 0.9,
      } = options;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature,
          topP: topP,
        },
      });

      const response = await result.response;
      const text = response.text();

      logger.info('Gemini AI text generation successful');
      return {
        success: true,
        text: text,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      logger.error(`Gemini AI error: ${error.message}`);
      throw new AppError(`Gemini AI service error: ${error.message}`, 500);
    }
  }

  async analyzeText(text, analysisType = 'general') {
    try {
      const prompts = {
        sentiment: `Analyze the sentiment of the following text and provide a detailed response with sentiment score (positive, negative, neutral) and confidence level: "${text}"`,
        summary: `Provide a concise summary of the following text: "${text}"`,
        keywords: `Extract the main keywords and key phrases from the following text: "${text}"`,
        general: `Analyze the following text and provide insights: "${text}"`,
      };

      const prompt = prompts[analysisType] || prompts.general;
      return await this.generateText(prompt);
    } catch (error) {
      logger.error(`Text analysis error: ${error.message}`);
      throw error;
    }
  }

  async chatCompletion(messages, options = {}) {
    try {
      if (!this.genAI) {
        throw new AppError('Gemini AI service is not configured', 500);
      }

      // Convert messages to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const result = await this.model.generateContent({
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          topP: options.topP || 0.9,
        },
      });

      const response = await result.response;
      const text = response.text();

      logger.info('Gemini AI chat completion successful');
      return {
        success: true,
        message: {
          role: 'assistant',
          content: text,
        },
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      logger.error(`Gemini AI chat completion error: ${error.message}`);
      throw new AppError(`Gemini AI service error: ${error.message}`, 500);
    }
  }
}

module.exports = new GeminiService();
