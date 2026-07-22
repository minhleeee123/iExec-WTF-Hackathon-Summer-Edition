export default function PageHeading({ eyebrow, title, description, aside }) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside && <div className="page-heading-aside">{aside}</div>}
    </section>
  );
}
