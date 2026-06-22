export function NewsCard({ title, source, desc, image, url }) {
  return (
    <a href={url} target="_blank" className="news-card">
      {image && <img src={image} alt={title} />}
      <div className="news-body">
        <span className="news-source">{source}</span>
        <p className="news-title">{title}</p>
        <p className="news-desc">{desc}</p>
      </div>
    </a>
  );
}