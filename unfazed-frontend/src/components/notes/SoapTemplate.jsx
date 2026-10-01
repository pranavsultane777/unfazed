const TEMPLATES = {
  soap: '<h3>Subjective</h3><p>Client report:</p><h3>Objective</h3><p>Observed presentation / interventions:</p><h3>Assessment</h3><p>Clinical assessment:</p><h3>Plan</h3><p>Next steps / follow-up:</p>',
  dap: '<h3>Data</h3><p>Client report and observed data:</p><h3>Assessment</h3><p>Clinical assessment and progress:</p><h3>Plan</h3><p>Next steps / follow-up:</p>',
};

export default function SoapTemplate({ mode = 'soap', onInsert }) {
  const label = mode === 'dap' ? 'DAP template' : 'SOAP template';
  return (
    <div className="template-card">
      <div><b>{label}</b><span>Insert a structured starting template, then edit it before saving.</span></div>
      <button type="button" className="btn btn-outline" onClick={() => onInsert(TEMPLATES[mode])}>Insert</button>
    </div>
  );
}
