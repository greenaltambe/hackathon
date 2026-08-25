import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Gemini Client abstraction providing resilient, timeout-protected,
 * structured JSON generations for StockPulse.
 */
export class GeminiClient {
  constructor({ apiKey = null, modelName = null, timeoutMs = null } = {}) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.modelName = modelName || process.env.GEMINI_MODEL || DEFAULT_MODEL;
    this.timeoutMs = timeoutMs || Number(process.env.GEMINI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
    this.customCaller = null; // Used for mocking in automated tests
  }

  /**
   * Allows injecting a custom caller function for unit tests.
   * @param {Function} mockFn (prompt, systemInstruction) => Promise<string|object>
   */
  setMockCaller(mockFn) {
    this.customCaller = mockFn;
  }

  /**
   * Reset mock caller back to real API mode
   */
  clearMockCaller() {
    this.customCaller = null;
  }

  /**
   * Calls Gemini with structured JSON output configuration and request timeout protection.
   *
   * @param {string} prompt - Detailed prompt containing product context and requirements
   * @param {Object} [options]
   * @param {string} [options.systemInstruction] - Optional system-level prompt
   * @returns {Promise<Object>} Parsed JSON object from Gemini response
   */
  async generateJson(prompt, options = {}) {
    // If a mock caller is injected (for automated unit/integration tests)
    if (this.customCaller) {
      const mockResult = await this.customCaller(prompt, options.systemInstruction);
      if (typeof mockResult === 'string') {
        return JSON.parse(mockResult);
      }
      return mockResult;
    }

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment.');
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: options.systemInstruction || 'You are StockPulse AI, an expert e-commerce merchandising and inventory replenishment advisor. Output only valid JSON strictly matching the requested schema.',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for consistent, analytical recommendations
      },
    });

    // Execute with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Gemini API call timed out after ${this.timeoutMs}ms`)), this.timeoutMs);
    });

    const apiPromise = (async () => {
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      return JSON.parse(text);
    })();

    return await Promise.race([apiPromise, timeoutPromise]);
  }
}

export const geminiClient = new GeminiClient();
export default geminiClient;
