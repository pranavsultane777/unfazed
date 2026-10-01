export default function About({ therapist }) {
  return <div id="about" className="about-card"><h2>About Me</h2><p>{therapist.bio || 'A calm, supportive space to explore what you are going through and work toward meaningful change.'}</p><h3>Languages</h3><div className="tag-row">{(therapist.languages || []).map((x) => <span className="tag" key={x}>{x}</span>)}</div></div>;
}
