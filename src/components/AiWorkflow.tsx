import { aiCases, aiIntro, aiPrinciples } from '../data/content';

export function AiWorkflow() {
  return (
    <section id="ai" className="section wrap" aria-labelledby="ai-title">
      <div className="section-heading">
        <h2 id="ai-title">How I work with AI</h2>
        <p>Claude Code, Claude Design, Cursor, OpenAI Codex, and MCP.</p>
      </div>
      <p className="ai-intro">{aiIntro}</p>
      <div className="ai-grid">
        {aiCases.map(item => (
          <article className="career-card" key={item.title}>
            <p className="eyebrow">{item.where}</p>
            <h3>{item.title}</h3>
            <p className="ai-flow" aria-label={item.flow.join(' to ')}>
              {item.flow.map((step, index) => <span key={step}>{index > 0 && <span aria-hidden="true"> → </span>}{step}</span>)}
            </p>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
      <h3 className="ai-principles-title">How I keep it reliable</h3>
      <ol className="ai-principles">
        {aiPrinciples.map(item => <li key={item}>{item}</li>)}
      </ol>
    </section>
  );
}
