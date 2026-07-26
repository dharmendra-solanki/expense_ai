export const callGemini = async (prompt) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('GEMINI_API_KEY is not defined in environment variables. Falling back to rules-based or local generation.');
        throw new Error('Gemini API key is missing. Please configure GEMINI_API_KEY in server/.env');
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('Empty response from Gemini model');
        }

        return JSON.parse(text);
    } catch (err) {
        console.error('Error calling Gemini API:', err.message);
        throw err;
    }
};

export const analyzeTransactionsPrompt = (transactions) => {
    const txData = transactions.map((t) => ({
        date: t.transaction_date,
        amount: t.amount,
        type: t.type,
        category: t.category_name,
        description: t.description,
        notes: t.notes,
    }));

    return `
You are a financial advisor assistant. Analyze the following list of recent transactions for the user:
${JSON.stringify(txData, null, 2)}

Provide a concise, useful summary of their spending habits and any trends or anomalies you observe.
You must respond with a JSON object containing exactly the following two keys:
1. "insight": (string) A concise 2-3 sentence description of their spending. Focus on where their money is going, their top categories, and suggestions.
2. "highlight": (string) A short 2-4 word tag summarizing their situation (e.g., "Stable spending", "Rent dominant", "Food spike", "Good savings").

Your output must be valid JSON matching the format:
{
  "insight": "Your analysis goes here.",
  "highlight": "Tag summary"
}
`;
};

export const analyzeBudgetsPrompt = (budgets) => {
    const budgetsData = budgets.map((b) => ({
        id: b.id,
        category: b.category_name,
        amount: b.amount,
        spent: b.spent,
        period: b.period,
    }));

    return `
You are a financial planning AI. Analyze the following budget thresholds vs actual spent amounts for the current month:
${JSON.stringify(budgetsData, null, 2)}

For each budget item, evaluate if they are pacing well or at risk of overspending given the period (monthly or weekly).
You must respond with a JSON object containing an array of analyses:
{
  "analyses": [
    {
      "budgetId": <number matching the budget id>,
      "status": <string: "good" | "caution" | "concerning" depending on how much they spent vs budget amount>,
      "message": <string: a single concise sentence explanation, e.g. "Food is at $320 of $400 - pacing well with two weeks left.">
    }
  ]
}

Ensure the output is valid JSON.
`;
};

export const generateInsightsPrompt = (type, dataContext) => {
    const { summary, transactions, categoriesBreakdown, budgets } = dataContext;

    if (type === 'monthly_summary') {
        return `
You are a personal finance assistant. Analyze the user's current monthly dashboard summary:
- Month Aggregates: ${JSON.stringify(summary)}
- Top Categories: ${JSON.stringify(categoriesBreakdown)}
- Active Budgets: ${JSON.stringify(budgets)}
- Recent Transactions: ${JSON.stringify(transactions.slice(0, 15))}

Provide a comprehensive monthly review and health score.
You must respond with a JSON object matching this structure:
{
  "summary": "A friendly, clear summary of how they are doing this month.",
  "highlights": [
    "Highlight 1: a key positive observation (e.g. high savings rate, category under budget)"
  ],
  "concerns": [
    "Concern 1: areas they need to watch out for (e.g. overspent categories, subscriptions creep)"
  ],
  "recommendations": [
    {
      "title": "Short title of action",
      "detail": "Detailed, specific description of the recommendation."
    }
  ],
  "topSpendingCategory": "Name of the highest expense category",
  "estimatedMonthlySavings": <number representing potential extra savings in currency units>,
  "healthScore": <integer between 0 and 100 based on their budget compliance and savings rate>
}

Ensure the output is valid JSON.
`;
    } else {
        // savings_tips
        return `
You are a wealth builder AI. Analyze the user's spending habits to find opportunities for extra savings:
- Month Aggregates: ${JSON.stringify(summary)}
- Top Spending Categories: ${JSON.stringify(categoriesBreakdown)}
- Active Budgets: ${JSON.stringify(budgets)}
- Recent Transactions: ${JSON.stringify(transactions.slice(0, 20))}

Suggest 3-4 highly actionable and practical savings tips with estimated monthly savings.
You must respond with a JSON object matching this structure:
{
  "overallTip": "An overall summary statement highlighting their top leaking areas.",
  "tips": [
    {
      "category": "Name of category, e.g. Food & Dining",
      "title": "Short, catchy tip title, e.g. Brew coffee at home twice a week",
      "detail": "Detailed description of how they can achieve this and why.",
      "estimatedSavings": <number: estimated dollar savings per month from this tip>
    }
  ]
}

Ensure the output is valid JSON.
`;
    }
};
