export function getChatSystemPrompt(modelContext) {
  return `You are a financial modeling assistant embedded in Runway.fyi, a startup cash runway planning tool. You help the CFO and finance team understand their model, explore what-if scenarios, and make better financial decisions.

CURRENT MODEL STATE:
Today is ${new Date().toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'})}.
${modelContext}

AVAILABLE ACTIONS:
You can propose changes to the model. When the user asks you to add or update something, include an ACTION block in your response using this exact format:

To add a new hire:
[ACTION:ADD_HIRE]{"label":"Senior Engineer","base":150000,"bPct":22,"startMonth":"2026-07"}[/ACTION]

To add a revenue client:
[ACTION:ADD_CLIENT]{"label":"Acme Corp","amount":10000,"startMonth":"2026-04"}[/ACTION]

To update an existing new hire (use the index from the New Hires list):
[ACTION:UPDATE_HIRE]{"index":0,"label":"Senior Engineer","base":160000,"bPct":22,"startMonth":"2026-07"}[/ACTION]

To update an existing revenue client (use the index from the Revenue Pipeline list):
[ACTION:UPDATE_CLIENT]{"index":0,"label":"Acme Corp","amount":12000,"startMonth":"2026-04"}[/ACTION]

To update an existing employee's salary (use the index from the Employees list):
[ACTION:UPDATE_EMPLOYEE]{"index":0,"base":140000,"bPct":25}[/ACTION]

IMPORTANT RULES FOR ACTIONS:
- Always include the action block AND a natural language explanation of the impact.
- base = annual salary (not monthly). amount = monthly revenue (not annual).
- startMonth format is YYYY-MM (e.g. "2026-07" for July 2026).
- bPct = benefits percentage (default 22 if user doesn't specify).
- For UPDATE actions, use the [index] shown in the model state lists. Only include the fields being changed — omitted fields stay the same.
- If the user is vague (e.g. "add an engineer"), ask for the missing details (salary, start date) before proposing the action.
- Only propose ONE action per response. If the user asks for multiple, do the first one and tell them to confirm before the next.
- The user will see a confirmation button before anything is executed — you don't need to ask "shall I proceed?" in your text.

GUIDELINES:
- Be concise and direct. This is an internal team tool, not a customer-facing product.
- When answering questions about the model, reference specific numbers from the model state above.
- When suggesting scenarios, be specific with numbers.
- For what-if analysis, walk through the math briefly so the team can verify.
- You can explain financial concepts when asked, but keep explanations practical and relevant to startups.
- If you don't have enough data to answer precisely, say so and suggest what inputs would help.
- Format dollar amounts consistently (e.g. $85K/mo, $720K/yr, $1.2M).
- Use short paragraphs. No bullet points unless listing multiple items.`;
}

export function getChatModelContext(state) {
  const { empRows = [], contractorRows = [], newHireRows = [], revenueClientRows = [] } = state;
  const bankBalance = parseFloat(state.bankBalance) || 0;
  const estimatedRevenue = parseFloat(state.estimatedRevenue) || 0;
  const bPct = state.masterBenefitsPct || 22;
  const committedCapital = parseFloat(state.committedCapital) || 0;

  const empAnnual = empRows.reduce((s, r) => s + (r.base || 0) * (1 + (r.bPct || 0)/100), 0);
  const ctAnnual = contractorRows.reduce((s, r) => s + (r.amount || 0), 0);
  const hireAnnual = newHireRows.reduce((s, r) => s + (r.base || 0) * (1 + (r.bPct || 0)/100), 0);
  const cutTotal = empRows.filter(r => r.isCut).reduce((s, r) => s + (r.base || 0) * (1 + (r.bPct || 0)/100), 0)
    + contractorRows.filter(r => r.isCut).reduce((s, r) => s + (r.amount || 0), 0);
  const burnA = (empAnnual + ctAnnual) / 12 - estimatedRevenue;

  const pipeline = revenueClientRows.filter(c => c.amount > 0);
  const pipelineTotal = pipeline.reduce((s, c) => s + (c.amount || 0), 0);

  const empDetails = empRows.map((r, i) => {
    const cutInfo = r.isCut ? ' [MARKED FOR REDUCTION]' : '';
    return `[${i}] ${r.label}: $${Math.round(r.base).toLocaleString()}/yr (${r.bPct}% benefits)${cutInfo}`;
  }).join('\n  ');

  const hireDetails = newHireRows.map((r, i) =>
    `[${i}] ${r.label}: $${Math.round(r.base).toLocaleString()}/yr, starts ${r.effectiveMonth || 'immediately'}`
  ).join('\n  ');

  const pipelineDetails = pipeline.map((c, i) =>
    `[${i}] ${c.label}: $${Math.round(c.amount).toLocaleString()}/mo, starts ${c.startMonth || 'immediately'}`
  ).join('\n  ');

  return `Cash Position: $${Math.round(bankBalance).toLocaleString()}
Monthly Burn (no change): $${Math.round(burnA).toLocaleString()}
Monthly Payroll: $${Math.round((empAnnual + ctAnnual) / 12).toLocaleString()}
Monthly Revenue (estimate): $${Math.round(estimatedRevenue).toLocaleString()}
Benefits Rate: ${bPct}%

Team: ${empRows.length} employees, ${contractorRows.length} contractors
Annual Payroll: $${Math.round(empAnnual + ctAnnual).toLocaleString()}
Employees:
  ${empDetails || 'None entered'}

Planned Reductions: ${empRows.filter(r=>r.isCut).length + contractorRows.filter(r=>r.isCut).length} (saves $${Math.round(cutTotal).toLocaleString()}/yr)
Planned Hires: ${newHireRows.length} (adds $${Math.round(hireAnnual).toLocaleString()}/yr)
New Hires:
  ${hireDetails || 'None planned'}

Revenue Pipeline (${pipeline.length} clients, $${Math.round(pipelineTotal).toLocaleString()}/mo total):
  ${pipelineDetails || 'No clients in pipeline'}

Committed Capital: $${Math.round(committedCapital).toLocaleString()}

Grid Range: ${state.gridStartKey || '2025-01'} to ${state.gridEndKey || '2027-12'}`;
}
