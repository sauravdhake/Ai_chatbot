import { ChatGroq } from '@langchain/groq';

/**
 * Initilise the LLM
 */
export const model = new ChatGroq({
    model: 'openai/gpt-oss-120b',
    temperature: 0,
});
