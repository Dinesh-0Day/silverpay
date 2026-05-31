import ProfileMarkSvg from "./ProfileMarkSvg";

type Props = {
  /** Reserved for future persona variants; illustration is fixed male mark. */
  seed?: string;
  size?: number;
  className?: string;
};

/**
 * Male persona mark with pop-out (head above the bust). Matches SuperPay ProfilePersonaAvatar.
 */
export default function ProfilePersonaAvatar({ size = 48, className = "" }: Props) {
  const pop = Math.round(size * 0.3);
  const lift = Math.round(size * 0.04);
  const art = Math.round(size * 1.24);
  const shellW = Math.round(art * 0.95);
  const shellH = size + pop;
  const artLift = Math.round(size * 0.09);
  const artAreaH = art + pop * 0.35;

  return (
    <div
      className={`profile-persona-avatar ${className}`.trim()}
      style={{
        width: shellW,
        height: shellH,
        transform: `translateY(${lift}px)`,
      }}
      aria-hidden
    >
      <div
        className="profile-persona-avatar__art-wrap"
        style={{ height: artAreaH }}
      >
        <div className="profile-persona-avatar__art" style={{ transform: `translateY(-${artLift}px)` }}>
          <ProfileMarkSvg size={art} />
        </div>
      </div>
    </div>
  );
}
