import { getInitials } from '../../utils/formatters';

export default function ProfileHero({ therapist }) {
  if (!therapist) return null;
  return (
    <section id="home" className="profile-hero">
      <div className="profile-photo">
        {getInitials(therapist.name, 'Dr')}
      </div>
      <div>
        {therapist.verified ? <span className="hero-pill">✓ Verified Therapist</span> : null}
        <h1>{therapist.name}</h1>
        <h3>Licensed Mental Health Professional</h3>
        <p>{therapist.bio || 'A calm, supportive space for your personal growth and therapy journey.'}</p>
        <div className="tag-row">
          {(therapist.specializations || []).map((s) => (
            <span className="tag" key={s}>{s}</span>
          ))}
        </div>
      </div>
    </section>
  );
}