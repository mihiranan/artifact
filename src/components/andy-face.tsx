const PATHS = {
  leftEye:
    "M126 140.616V166.273C126 171.584 130.029 175.89 135 175.89C139.971 175.89 144 171.584 144 166.273V140.616C144 135.305 139.971 131 135 131C130.029 131 126 135.305 126 140.616Z",
  rightEye:
    "M274.421 140.616V166.273C274.421 171.584 278.45 175.89 283.421 175.89C288.392 175.89 292.421 171.584 292.421 166.273V140.616C292.421 135.305 288.392 131 283.421 131C278.45 131 274.421 135.305 274.421 140.616Z",
  smile:
    "M144.799 270.17C162.354 286.509 183.616 294.754 208.105 294.754C232.595 294.754 253.856 286.509 271.411 270.17C275.236 266.61 275.443 260.631 271.873 256.817C268.303 253.003 262.308 252.797 258.483 256.357C244.46 269.409 227.826 275.86 208.105 275.86C188.384 275.86 171.751 269.409 157.727 256.357C153.902 252.797 147.907 253.003 144.337 256.817C140.767 260.631 140.974 266.61 144.799 270.17Z",
  nose: "M208.105 140.447V206.579C208.105 210.811 206.031 212.877 201.766 212.877H195.474C190.241 212.877 186 217.107 186 222.325C186 227.542 190.241 231.772 195.474 231.772H201.766C216.49 231.772 227.053 221.251 227.053 206.579V140.447C227.053 135.23 222.811 131 217.579 131C212.347 131 208.105 135.23 208.105 140.447Z",
};

export function AndyFace({
  size = 28,
  color = "currentColor",
  blink = false,
  className,
}: {
  size?: number;
  color?: string;
  blink?: boolean;
  className?: string;
}) {
  const blinkClass = blink
    ? "origin-[135px_153px] animate-[smileBlink_4s_ease-in-out_infinite]"
    : "";
  const blinkClassR = blink
    ? "origin-[283px_153px] animate-[smileBlink_4s_ease-in-out_infinite]"
    : "";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 417 417"
      fill="none"
      className={className}
    >
      <path d={PATHS.leftEye} fill={color} className={blinkClass} />
      <path d={PATHS.rightEye} fill={color} className={blinkClassR} />
      <path d={PATHS.smile} fill={color} />
      <path d={PATHS.nose} fill={color} />
    </svg>
  );
}
