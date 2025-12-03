import React, { useState, useRef, useEffect } from "react";

export default function TooltipButton({
  children,
  tooltip,
  delay = 200,
  placement = "bottom",
  className,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const isMobile = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  };

  const show = () => {
    if (isMobile()) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  // Positioning basic styles
  const tooltipStyle = {
    position: "absolute",
    zIndex: 9999,
    whiteSpace: "nowrap",
    background: "rgba(0,0,0,0.8)",
    color: "#fff",
    padding: "6px 8px",
    borderRadius: 4,
    fontSize: 12,
    pointerEvents: "none",
    transition: "opacity 120ms ease-in-out, transform 120ms ease-in-out",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(6px)",
  };

  const wrapperStyle = {
    display: "inline-block",
    position: "relative",
  };

  const getPlacementStyle = () => {
    if (placement === "top") {
      return { bottom: "100%", left: "50%", transform: visible ? "translate(-50%, -6px)" : "translate(-50%, 6px)" };
    }
    if (placement === "right") {
      return { left: "100%", top: "50%", transform: visible ? "translate(6px, -50%)" : "translate(-6px, -50%)" };
    }
    if (placement === "left") {
      return { right: "100%", top: "50%", transform: visible ? "translate(-6px, -50%)" : "translate(6px, -50%)" };
    }
    return { top: "100%", left: "50%", transform: visible ? "translate(-50%, 6px)" : "translate(-50%, -6px)" };
  };

  return (
    <span
      ref={wrapperRef}
      style={wrapperStyle}
      className={className}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={() => {}}
    >
      {children}
      {!isMobile() && (
        <span
          role="tooltip"
          aria-hidden={!visible}
          style={{ ...tooltipStyle, ...getPlacementStyle() }}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
