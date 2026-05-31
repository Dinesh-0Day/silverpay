import { Link } from "react-router-dom";

function resolveImageUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

type Props = {
  imageUrl: string;
  linkUrl: string;
};

export default function HomePromoBanner({ imageUrl, linkUrl }: Props) {
  const src = resolveImageUrl(imageUrl);
  const img = <img src={src} alt="" className="home-promo-img" />;
  const href = linkUrl?.trim();
  if (href) {
    if (href.startsWith("http")) {
      return (
        <a href={href} className="home-promo-banner" target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      );
    }
    const path = href.startsWith("/") ? href : `/${href}`;
    return (
      <Link to={path} className="home-promo-banner">
        {img}
      </Link>
    );
  }
  return <div className="home-promo-banner">{img}</div>;
}

export function formatFlowAmount(n: number) {
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001) return Math.round(n).toString();
  return n.toFixed(2);
}
