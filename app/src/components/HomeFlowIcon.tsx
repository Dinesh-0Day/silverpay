type Props = {
  direction: "down" | "up";
};

/** Deposit (↓ green) / Withdrawal (↑ orange) arrows for home flow card */
export default function HomeFlowIcon({ direction }: Props) {
  const isDown = direction === "down";
  return (
    <span
      className={`home-flow-arrow ${isDown ? "home-flow-arrow-down" : "home-flow-arrow-up"}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="home-flow-arrow-svg">
        {isDown ? (
          <>
            <path
              d="M12 5v10"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
            />
            <path
              d="M8 15l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <path
              d="M12 19V9"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
            />
            <path
              d="M8 11l4-4 4 4"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </span>
  );
}
