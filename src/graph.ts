import { END, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { StateAnnotation } from './state';
import { model } from './model';
import { getOffers, kbRetrieverTool } from './tools';
import type { AIMessage } from '@langchain/core/messages';

/**
 * Marketing tool
 */
const marketingTools = [getOffers];
const marketingToolNode = new ToolNode(marketingTools);

/**
 * Learning tool
 */
const learningTools = [kbRetrieverTool];
const learningToolNode = new ToolNode(learningTools);

async function frontDeskSupport(state: typeof StateAnnotation.State) {
    const SYSTEM_PROMPT = `You are frontline support staff for Coder’s Gyan, an ed-tech company that helps software developers excel in their careers through practical web development and Generative AI courses.
Be concise in your responses.
You can chat with students and help them with basic questions, but if the student is having a marketing or learning support query,
do not try to answer the question directly or gather information.
Instead, immediately transfer them to the marketing team(promo codes, discounts, offers, and special campaigns) or learning support team(courses, syllabus coverage, learning paths, and study strategies) by asking the user to hold for a moment.
Otherwise, just respond conversationally.`;

    const supportResponse = await model.invoke([
        { role: 'system', content: SYSTEM_PROMPT },
        ...state.messages,
    ]);

    const CATEGORIZATION_SYSTEM_PROMPT = `You are an expert customer support routing system.
Your job is to detect whether a customer support representative is routing a user to a marketing team or learning support team, or if they are just responding conversationally.`;

    const CATEGORIZATION_HUMAN_PROMPT = `The previous conversation is an interaction between a customer support representative and a user.
Extract whether the representative is routing the user to a marketing team or learning support team, or whether they are just responding conversationally.
Respond with a JSON object containing a single key called "nextRepresentative" with one of the following values:

If they want to route the user to the marketing team, respond with "MARKETING".
If they want to route the user to the learning support team, respond with "LEARNING".
Otherwise, respond only with the word "RESPOND".`;

    const categorizationResponse = await model.invoke(
        [
            {
                role: 'system',
                content: CATEGORIZATION_SYSTEM_PROMPT,
            },
            ...state.messages,
            supportResponse,
            {
                role: 'user',
                content: CATEGORIZATION_HUMAN_PROMPT,
            },
        ],
        {
            response_format: {
                type: 'json_object',
            },
        }
    );

    const categorizationOutput = JSON.parse(categorizationResponse.content as string);

    return {
        messages: [supportResponse],
        nextRepresentative: categorizationOutput.nextRepresentative,
    };
}

async function marketingSupport(state: typeof StateAnnotation.State) {
    // Logic for frontdesk support

    const llmWithTools = model.bindTools(marketingTools);

    const SYSTEM_PROMPT = `You are part of the Marketing Team at Coder's Gyan, an ed-tech company that helps software developers excel in their careers through practical web development and Generative AI courses.
You specialize in handling questions about promo codes, discounts, offers, and special campaigns.
Answer clearly, concisely, and in a friendly manner. For queries outside promotions (course content, learning), politely redirect the student to the correct team.
Important: Answer only using given context, else say I don't have enough information about it.`;

    let trimmedHistory = state.messages;

    if (trimmedHistory.at(-1)?.getType() === 'ai') {
        trimmedHistory = trimmedHistory.slice(0, -1); // [1, 2, 3] -> [1, 2]
    }

    const marketingResponse = await llmWithTools.invoke([
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        ...trimmedHistory,
    ]);

    return {
        messages: [marketingResponse],
    };
}

async function learningSupport(state: typeof StateAnnotation.State) {
    const SYSTEM_PROMPT = `You are part of the Learning Support Team at Coder's Gyan, an ed-tech company that helps software developers excel in their careers through practical web development and Generative AI courses.
You assist students with questions about available courses, syllabus coverage, learning paths, and study strategies.
Keep your answers concise, clear, and supportive. Strictly use information from retrived context for answering queries. If the query is about learning issues, politely redirect the student to the respective team.
Important: Call retrieve_learning_knowledge_base max 3 times if the tool result is not relevant to original query.`;

    let trimmedHistory = state.messages;

    if (trimmedHistory.at(-1)?.getType() === 'ai') {
        trimmedHistory = trimmedHistory.slice(0, -1); // [1, 2, 3] -> [1, 2]
    }

    const llmWithTools = model.bindTools(learningTools);

    const learningResponse = await llmWithTools.invoke([
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        ...trimmedHistory,
    ]);

    return {
        messages: [learningResponse],
    };
}

function whoIsNext(state: typeof StateAnnotation.State) {
    if (state.nextRepresentative.includes('MARKETING')) {
        return 'marketingSupport';
    } else if (state.nextRepresentative.includes('LEARNING')) {
        return 'learningSupport';
    } else if (state.nextRepresentative.includes('RESPOND')) {
        return '__end__';
    } else {
        return '__end__';
    }
}

function isMarketingTool(state: typeof StateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

    if (lastMessage.tool_calls?.length) {
        return 'marketingTools';
    }

    return '__end__';
}

function isLearningTool(state: typeof StateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

    if (lastMessage.tool_calls?.length) {
        return 'learningTools';
    }

    return '__end__';
}

const graph = new StateGraph(StateAnnotation)
    .addNode('frontDeskSupport', frontDeskSupport)
    .addNode('marketingSupport', marketingSupport)
    .addNode('learningSupport', learningSupport)
    .addNode('marketingTools', marketingToolNode)
    .addNode('learningTools', learningToolNode)
    .addEdge('__start__', 'frontDeskSupport')
    .addEdge('marketingTools', 'marketingSupport')
    .addEdge('learningTools', 'learningSupport')
    .addConditionalEdges('frontDeskSupport', whoIsNext, {
        marketingSupport: 'marketingSupport',
        learningSupport: 'learningSupport',
        __end__: '__end__',
    })
    .addConditionalEdges('marketingSupport', isMarketingTool, {
        marketingTools: 'marketingTools',
        __end__: END,
    })
    .addConditionalEdges('learningSupport', isLearningTool, {
        learningTools: 'learningTools',
        __end__: END,
    });

const app = graph.compile();

// invoke

async function main() {
    const stream = await app.stream({
        messages: [
            {
                role: 'user',
                content: 'Which language the GenAI course is in?',
            },
        ],
    });

    for await (const value of stream) {
        console.log('----STEP----');
        console.log(value);
        console.log('----STEP----');
    }
}

main();
